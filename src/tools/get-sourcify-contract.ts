import { z } from 'zod'
import {
  fetchSourcifyContract,
  getSourcifyChainId,
  SourcifyAbiItemSchema,
  SourcifyProxyResolutionSchema,
  SourcifySignaturesSchema,
} from '@/services/sourcify'
import { getThorNetworkType, ThorAddressSchema } from '@/services/thor'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

// Available fields for the Sourcify API (note: 'name' comes from compilation.name, not a separate field)
const AVAILABLE_FIELDS = [
  'abi',
  'sources',
  'metadata',
  'storageLayout',
  'userdoc',
  'devdoc',
  'stdJsonInput',
  'stdJsonOutput',
  'compilation', // Contains name, compilerVersion
  'deployment', // Contains deployer, transactionHash
  'proxyResolution', // IMPORTANT: needed to detect proxies
  'signatures',
  'creationBytecode',
  'runtimeBytecode',
] as const

const InputSchema = z
  .object({
    address: ThorAddressSchema.describe('Contract address to look up (0x prefixed, 40 hex characters)'),
    resolveProxy: z
      .boolean()
      .optional()
      .default(true)
      .describe(
        'If true and contract is a proxy, automatically fetch the implementation ABI (default: true). IMPORTANT: Most VeChain contracts are proxies!',
      ),
    fields: z
      .array(z.enum(AVAILABLE_FIELDS))
      .optional()
      .describe(
        'Specific fields to fetch. If not provided, fetches ALL fields (recommended). Note: contract name comes from "compilation" field. Options: abi, sources, metadata, storageLayout, userdoc, devdoc, stdJsonInput, stdJsonOutput, compilation, deployment, proxyResolution, signatures, creationBytecode, runtimeBytecode',
      ),
  })
  .describe('Parameters for fetching a verified contract from Sourcify')

const OutputContractSchema = z.object({
  match: z.string().describe('Verification match type: exact_match or match'),
  chainId: z.string().describe('Chain ID'),
  address: z.string().describe('Contract address queried'),
  verifiedAt: z.string().optional().describe('Verification timestamp'),
  // These are the EFFECTIVE name/abi - for proxies, these will be from the implementation
  name: z.string().optional().describe('Contract name to use - for proxies this is the implementation name (e.g. "VeBetterDAO"), not the proxy wrapper'),
  abi: z.array(SourcifyAbiItemSchema).optional().describe('Contract ABI to use - for proxies this is the implementation ABI with all functions'),
  compilerVersion: z.string().optional().describe('Compiler version'),
  signatures: SourcifySignaturesSchema.optional().describe('Function/event/error signatures'),
  deployer: z.string().nullable().optional().describe('Deployer address'),
  transactionHash: z.string().nullable().optional().describe('Deployment transaction hash'),
  sourceCount: z.number().optional().describe('Number of source files'),
  // Proxy info
  isProxy: z.boolean().optional().describe('Whether this contract is a proxy'),
  implementationAddress: z.string().optional().describe('Implementation contract address (only present for proxies)'),
  proxyName: z.string().optional().describe('Original proxy contract name (e.g. "TransparentUpgradeableProxy") - only for reference'),
})

const OutputSchema = z
  .object({
    ok: z.boolean().describe('Whether the fetch was successful'),
    network: z.string().describe('The VeChain network used'),
    chainId: z.string().describe('The Sourcify chain ID used'),
    address: z.string().describe('The contract address queried'),
    contract: OutputContractSchema.optional().describe('The verified contract data'),
    error: z.string().optional().describe('Error message if fetch failed'),
  })
  .describe('Sourcify verified contract result')

export type GetSourcifyContractResponse = {
  content: Array<{ type: 'text'; text: string }>
  structuredContent: z.infer<typeof OutputSchema>
}

export const getSourcifyContract: MCPTool = {
  name: 'getSourcifyContract',
  title: 'Sourcify: Get Verified Contract',
  description:
    'Fetch a verified smart contract from Sourcify for VeChain. Returns contract name, ABI, and metadata. PROXY HANDLING: Most VeChain contracts are proxies. When isProxy=true, the returned name and abi fields are ALREADY from the implementation contract (the actual contract you want). The proxyName field shows the original proxy wrapper name for reference. Just use the name and abi fields directly - they always contain what you need. Only works on VeChain mainnet (chainId 100009) and testnet (chainId 100010).',
  inputSchema: InputSchema.shape,
  outputSchema: OutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (params: z.infer<typeof InputSchema>): Promise<GetSourcifyContractResponse> => {
    const network = getThorNetworkType()
    const chainId = getSourcifyChainId()

    if (!chainId) {
      const errorResult = {
        ok: false,
        network,
        chainId: 'unsupported',
        address: params.address,
        error: `Sourcify is not supported for the ${network} network. Only mainnet and testnet are supported.`,
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(errorResult) }],
        structuredContent: errorResult,
      }
    }

    try {
      const parsed = InputSchema.parse(params)
      const address = parsed.address
      const resolveProxy = parsed.resolveProxy ?? true

      // Build fields parameter - always use 'all' by default for complete proxy detection
      // When custom fields specified, ensure we include essential fields for proxy resolution
      let fieldsParam = 'all'
      if (parsed.fields && parsed.fields.length > 0) {
        const fields = new Set(parsed.fields)
        // Always include these for proxy detection and name extraction
        fields.add('compilation') // For contract name
        fields.add('abi') // For contract ABI
        if (resolveProxy) {
          fields.add('proxyResolution') // For detecting proxies
        }
        fieldsParam = Array.from(fields).join(',')
      }

      logger.debug(`Fetching Sourcify contract with fields: ${fieldsParam}`)

      const contract = await fetchSourcifyContract(chainId, address, fieldsParam)

      if (contract === null) {
        const notFoundResult = {
          ok: false,
          network,
          chainId,
          address,
          error: `Contract not found or not verified on Sourcify for chainId ${chainId}`,
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(notFoundResult) }],
          structuredContent: notFoundResult,
        }
      }

      // Check if this is a proxy and we should resolve it
      const isProxy = contract.proxyResolution?.isProxy === true
      let implementationAddress: string | undefined
      let implementationAbi: z.infer<typeof SourcifyAbiItemSchema>[] | undefined
      let implementationName: string | undefined

      if (isProxy && resolveProxy && contract.proxyResolution?.implementations?.length) {
        // Get the first (usually only) implementation address
        const impl = contract.proxyResolution.implementations[0]
        implementationAddress = impl.address

        if (implementationAddress) {
          logger.debug(`Contract is a proxy, fetching implementation at: ${implementationAddress}`)

          // Fetch the implementation contract to get its ABI
          const implContract = await fetchSourcifyContract(chainId, implementationAddress, 'abi,compilation')

          if (implContract) {
            implementationAbi = implContract.abi
            implementationName = implContract.compilation?.name
            logger.debug(`Fetched implementation ABI: ${implementationName ?? 'unnamed'}`)
          } else {
            logger.debug(`Implementation contract not verified on Sourcify: ${implementationAddress}`)
          }
        }
      }

      // Build clean response - for proxies, use implementation name/abi as the main fields
      const proxyName = isProxy ? contract.compilation?.name : undefined
      const effectiveName = isProxy && implementationName ? implementationName : contract.compilation?.name
      const effectiveAbi = isProxy && implementationAbi ? implementationAbi : contract.abi

      const contractData = {
        match: contract.match,
        chainId: contract.chainId,
        address: contract.address,
        verifiedAt: contract.verifiedAt,
        // For proxies: name/abi are from implementation (what you actually want to use)
        name: effectiveName,
        abi: effectiveAbi,
        compilerVersion: contract.compilation?.compilerVersion,
        signatures: contract.signatures,
        deployer: contract.deployment?.deployer,
        transactionHash: contract.deployment?.transactionHash,
        sourceCount: contract.sources ? Object.keys(contract.sources).length : undefined,
        // Proxy info
        isProxy,
        implementationAddress,
        proxyName, // Original proxy name for reference (e.g. "TransparentUpgradeableProxy")
      }

      const successResult = {
        ok: true,
        network,
        chainId,
        address,
        contract: contractData,
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(successResult) }],
        structuredContent: successResult,
      }
    } catch (error) {
      logger.warn(`Error in getSourcifyContract: ${String(error)}`)
      const errorResult = {
        ok: false,
        network,
        chainId,
        address: params.address,
        error: `Error fetching Sourcify contract: ${String(error)}`,
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(errorResult) }],
        structuredContent: errorResult,
      }
    }
  },
}
