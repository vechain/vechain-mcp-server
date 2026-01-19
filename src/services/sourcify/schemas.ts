import { z } from 'zod'

// ============================================
// Contract List Schemas (GET /v2/contracts/{chainId})
// ============================================

/**
 * Schema for a contract in the list response
 */
export const SourcifyContractListItemSchema = z
  .object({
    match: z.string().describe('Match type: exact_match or match'),
    creationMatch: z.string().nullable().optional().describe('Creation bytecode match type'),
    runtimeMatch: z.string().nullable().optional().describe('Runtime bytecode match type'),
    chainId: z.string().describe('Chain ID'),
    address: z.string().describe('Contract address'),
    verifiedAt: z.string().optional().describe('Verification timestamp'),
    matchId: z.string().optional().describe('Unique match ID for pagination'),
  })
  .passthrough()

/**
 * Schema for the contracts list response
 */
export const SourcifyContractsListResponseSchema = z
  .object({
    results: z.array(SourcifyContractListItemSchema).describe('List of verified contracts'),
  })
  .passthrough()

// ============================================
// Single Contract Schemas (GET /v2/contract/{chainId}/{address})
// ============================================

/**
 * Schema for signature entry in contract response
 */
export const SourcifySignatureItemSchema = z
  .object({
    signature: z.string().describe('Human-readable signature'),
    signatureHash32: z.string().optional().describe('32-byte keccak256 hash'),
    signatureHash4: z.string().optional().describe('4-byte selector'),
  })
  .passthrough()

/**
 * Schema for signatures in contract response
 */
export const SourcifySignaturesSchema = z
  .object({
    function: z.array(SourcifySignatureItemSchema).optional().describe('Function signatures'),
    event: z.array(SourcifySignatureItemSchema).optional().describe('Event signatures'),
    error: z.array(SourcifySignatureItemSchema).optional().describe('Error signatures'),
  })
  .passthrough()

/**
 * Schema for proxy implementation
 */
export const SourcifyProxyImplementationSchema = z
  .object({
    address: z.string().describe('Implementation contract address'),
    name: z.string().optional().describe('Implementation contract name'),
  })
  .passthrough()

/**
 * Schema for proxy resolution in contract response
 */
export const SourcifyProxyResolutionSchema = z
  .object({
    isProxy: z.boolean().optional().describe('Whether the contract is a proxy'),
    proxyType: z.string().nullable().optional().describe('Type of proxy if applicable'),
    implementations: z.array(SourcifyProxyImplementationSchema).optional().describe('Implementation contracts'),
  })
  .passthrough()

/**
 * Schema for deployment info
 */
export const SourcifyDeploymentSchema = z
  .object({
    transactionHash: z.string().optional().describe('Deployment transaction hash'),
    blockNumber: z.union([z.string(), z.number()]).optional().describe('Deployment block number'),
    transactionIndex: z.union([z.string(), z.number()]).optional().describe('Transaction index in block'),
    deployer: z.string().optional().describe('Deployer address'),
  })
  .passthrough()

/**
 * Schema for compilation info
 */
export const SourcifyCompilationSchema = z
  .object({
    language: z.string().optional().describe('Source language (e.g., Solidity)'),
    compiler: z.string().optional().describe('Compiler used'),
    compilerVersion: z.string().optional().describe('Compiler version'),
    compilerSettings: z.record(z.any()).optional().describe('Compiler settings'),
    name: z.string().optional().describe('Contract name'),
    fullyQualifiedName: z.string().optional().describe('Fully qualified contract name'),
  })
  .passthrough()

/**
 * Schema for Sourcify contract ABI item
 */
export const SourcifyAbiItemSchema = z
  .object({
    type: z.string().optional(),
    name: z.string().optional(),
    inputs: z.array(z.any()).optional(),
    outputs: z.array(z.any()).optional(),
    stateMutability: z.string().optional(),
    anonymous: z.boolean().optional(),
  })
  .passthrough()

/**
 * Schema for source file content
 */
export const SourcifySourceFileSchema = z
  .object({
    content: z.string().optional().describe('Source file content'),
  })
  .passthrough()

/**
 * Schema for verified contract response (full details)
 * Very permissive to handle API variations - uses passthrough() on all objects
 */
export const SourcifyVerifiedContractSchema = z
  .object({
    // Required fields
    match: z.string().describe('Match type: exact_match or match'),
    chainId: z.string().describe('Chain ID'),
    address: z.string().describe('Contract address'),
    // Optional fields
    creationMatch: z.string().nullable().optional().describe('Creation bytecode match'),
    runtimeMatch: z.string().nullable().optional().describe('Runtime bytecode match'),
    verifiedAt: z.string().optional().describe('Verification timestamp'),
    matchId: z.string().optional().describe('Unique match ID'),
    deployment: SourcifyDeploymentSchema.optional().describe('Deployment information'),
    sources: z.record(z.any()).optional().describe('Source files keyed by path'),
    compilation: SourcifyCompilationSchema.optional().describe('Compilation information'),
    abi: z.array(SourcifyAbiItemSchema).optional().describe('Contract ABI'),
    signatures: SourcifySignaturesSchema.optional().describe('Function/event/error signatures'),
    proxyResolution: SourcifyProxyResolutionSchema.optional().describe('Proxy resolution info'),
    // Bytecode fields (large, usually omitted)
    creationBytecode: z.any().optional().describe('Creation bytecode details'),
    runtimeBytecode: z.any().optional().describe('Runtime bytecode details'),
    // Other optional fields
    userdoc: z.any().optional(),
    devdoc: z.any().optional(),
    storageLayout: z.any().optional(),
    metadata: z.any().optional(),
    sourceIds: z.any().optional(),
    stdJsonInput: z.any().optional(),
    stdJsonOutput: z.any().optional(),
  })
  .passthrough()

// ============================================
// Signature Database Schemas (api.4byte.sourcify.dev)
// ============================================

/**
 * Schema for signature type (function or event)
 */
export const SignatureTypeSchema = z.enum(['function', 'event']).describe('Type of signature')

/**
 * Schema for a single signature entry from lookup response
 */
export const SignatureLookupEntrySchema = z
  .object({
    name: z.string().describe('Function/event signature (e.g., "transfer(address,uint256)")'),
    filtered: z.boolean().optional().describe('Whether the signature is filtered'),
    hasVerifiedContract: z.boolean().optional().describe('Whether there is a verified contract with this signature'),
  })
  .passthrough()

/**
 * Schema for signature lookup response (by hash)
 */
export const SignatureLookupResponseSchema = z
  .object({
    ok: z.boolean().describe('Whether the lookup was successful'),
    result: z
      .object({
        function: z
          .record(z.array(SignatureLookupEntrySchema))
          .optional()
          .describe('Function signatures keyed by hash'),
        event: z.record(z.array(SignatureLookupEntrySchema)).optional().describe('Event signatures keyed by hash'),
      })
      .passthrough(),
  })
  .passthrough()

/**
 * Schema for a single signature entry from search response
 */
export const SignatureSearchEntrySchema = z
  .object({
    id: z.number().optional().describe('Unique identifier'),
    created_at: z.string().optional().describe('Creation timestamp'),
    name: z.string().describe('Function/event name with parameters'),
    hash: z.string().optional().describe('4-byte function selector or 32-byte event topic hash'),
    type: z.string().optional().describe('Type: function or event'),
    filtered: z.boolean().optional().describe('Whether the signature is filtered'),
  })
  .passthrough()

/**
 * Schema for signature search response (by name)
 */
export const SignatureSearchResponseSchema = z
  .object({
    ok: z.boolean().describe('Whether the search was successful'),
    result: z.array(SignatureSearchEntrySchema).describe('Array of matching signatures'),
  })
  .passthrough()

// ============================================
// Type exports
// ============================================

export type SourcifyContractListItem = z.infer<typeof SourcifyContractListItemSchema>
export type SourcifyContractsListResponse = z.infer<typeof SourcifyContractsListResponseSchema>
export type SourcifySignatureItem = z.infer<typeof SourcifySignatureItemSchema>
export type SourcifySignatures = z.infer<typeof SourcifySignaturesSchema>
export type SourcifyProxyResolution = z.infer<typeof SourcifyProxyResolutionSchema>
export type SourcifyDeployment = z.infer<typeof SourcifyDeploymentSchema>
export type SourcifyCompilation = z.infer<typeof SourcifyCompilationSchema>
export type SourcifyAbiItem = z.infer<typeof SourcifyAbiItemSchema>
export type SourcifySourceFile = z.infer<typeof SourcifySourceFileSchema>
export type SourcifyVerifiedContract = z.infer<typeof SourcifyVerifiedContractSchema>
export type SignatureType = z.infer<typeof SignatureTypeSchema>
export type SignatureLookupEntry = z.infer<typeof SignatureLookupEntrySchema>
export type SignatureLookupResponse = z.infer<typeof SignatureLookupResponseSchema>
export type SignatureSearchEntry = z.infer<typeof SignatureSearchEntrySchema>
export type SignatureSearchResponse = z.infer<typeof SignatureSearchResponseSchema>
