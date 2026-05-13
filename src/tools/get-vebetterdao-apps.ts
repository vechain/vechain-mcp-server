import type { ContractClause } from '@vechain/sdk-core'
import { z } from 'zod'
import { ipfsToHttp, resolveMetadataUrl } from '@/services/ipfs'
import { getThorNetworkType } from '@/services/thor'
import {
  executeMulticall,
  getVeBetterDaoContractAddresses,
  getX2EarnAppsContract,
  getXAllocationVotingContract,
  unwrapPlain,
} from '@/services/vebetterdao-contracts'
import type { MCPTool } from '@/types'
import { mapWithConcurrency } from '@/utils/concurrency'
import { fetchJson } from '@/utils/fetch'
import { logger } from '@/utils/logger'

const SocialUrlSchema = z.object({ name: z.string(), url: z.string() })
const AppUrlSchema = z.object({ code: z.string(), url: z.string() })

const XAppMetadataSchema = z
  .object({
    name: z.string().optional(),
    description: z.string().optional(),
    external_url: z.string().optional(),
    logo: z.string().optional(),
    banner: z.string().optional(),
    screenshots: z.array(z.string()).optional(),
    social_urls: z.array(SocialUrlSchema).optional(),
    app_urls: z.array(AppUrlSchema).optional(),
    tweets: z.array(z.string()).optional(),
    ve_world: z
      .object({
        banner: z.string().optional(),
        featured_image: z.string().optional(),
      })
      .optional(),
    categories: z.array(z.string()).optional(),
    distribution_strategy: z.string().optional(),
  })
  .passthrough()

const RolesSchema = z.object({
  admin: z.string().nullable(),
  moderators: z.array(z.string()),
  creators: z.array(z.string()),
  rewardDistributors: z.array(z.string()),
  endorsers: z.array(z.string()).optional(),
})

const StatusSchema = z.object({
  appAvailableForAllocationVoting: z.boolean().describe('On-chain flag from the App tuple'),
  isBlacklisted: z.boolean(),
  isUnendorsed: z.boolean().describe('True if the app lost endorsement and is in grace period'),
  isEligibleNow: z.boolean().describe('True if currently eligible for receiving votes'),
  isActiveInCurrentRound: z
    .boolean()
    .describe('True if the appId is in XAllocationVoting.getAppIdsOfRound(currentRoundId)'),
  endorsementScore: z.string().describe('Total endorsement points (uint256 as decimal string)'),
  endorsementScoreThreshold: z.string().describe('Min endorsement points to be considered endorsed'),
  isEndorsed: z.boolean().describe('Derived: score >= threshold AND not blacklisted AND not unendorsed'),
})

const AppSchema = z.object({
  id: z.string().describe('App id (bytes32 hex)'),
  name: z.string().describe('On-chain app name'),
  teamWalletAddress: z.string().describe('Team wallet / on-chain owner'),
  metadataURI: z.string(),
  metadataUrl: z.string().nullable().describe('Resolved gateway URL of the metadata JSON'),
  createdAtTimestamp: z.string().describe('Unix seconds (uint256 as string)'),
  description: z.string().nullable(),
  website: z.string().nullable(),
  logo: z.string().nullable(),
  banner: z.string().nullable(),
  categories: z.array(z.string()).optional(),
  socials: z.array(SocialUrlSchema).optional(),
  roles: RolesSchema,
  status: StatusSchema,
  metadata: XAppMetadataSchema.nullable(),
})

const OutputDataSchema = z.object({
  network: z.string(),
  contracts: z.object({
    x2EarnApps: z.string(),
    xAllocationVoting: z.string(),
  }),
  globalConfig: z.object({
    currentRoundId: z.string().nullable(),
    endorsementScoreThreshold: z.string(),
    gracePeriod: z.string(),
    cooldownPeriod: z.string(),
    endorsementsPaused: z.boolean(),
  }),
  totalCount: z.number(),
  endorsedCount: z.number(),
  unendorsedCount: z.number(),
  blacklistedCount: z.number(),
  activeInCurrentRoundCount: z.number(),
  apps: z.array(AppSchema),
})

const OutputSchema = z.object({
  ok: z.boolean(),
  network: z.string(),
  data: OutputDataSchema.nullable().optional(),
  error: z.string().optional(),
})

const InputSchema = z
  .object({
    appId: z
      .string()
      .regex(/^0x[0-9a-fA-F]{64}$/, 'appId must be a 0x-prefixed bytes32 hex string')
      .optional()
      .describe('Optional bytes32 app id; if provided, only that app is returned'),
    includeUnendorsed: z
      .boolean()
      .optional()
      .default(true)
      .describe('Include apps currently in grace period (lost endorsements)'),
    includeMetadata: z
      .boolean()
      .optional()
      .default(true)
      .describe('Fetch off-chain IPFS metadata (description, logo, socials, categories...)'),
    includeRoles: z
      .boolean()
      .optional()
      .default(true)
      .describe('Fetch admin/moderators/creators/rewardDistributors per app'),
    includeEndorsers: z
      .boolean()
      .optional()
      .default(false)
      .describe('Fetch endorser addresses per app (extra on-chain calls)'),
    onlyActiveInCurrentRound: z
      .boolean()
      .optional()
      .default(false)
      .describe('Return only apps included in the current round of voting'),
    categories: z
      .array(z.string())
      .optional()
      .describe(
        'Optional array of category ids to filter apps by (case-insensitive, OR semantics). Categories live in the IPFS metadata, so includeMetadata is forced to true when this is set. Known mainnet categories: nutrition, plastic-waste-recycling, fitness-wellness, renewable-energy-efficiency, sustainable-shopping, green-mobility-travel, pets, education-learning, green-finance-defi, others (deprecated: social-community-activism, carbon-footprint).',
      ),
    metadataConcurrency: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(10)
      .describe('Concurrency limit for IPFS metadata fetches'),
  })
  .describe('Filters and options for getVeBetterDaoApps')

type Input = z.infer<typeof InputSchema>
export type GetVeBetterDaoAppsResponse = {
  content: Array<{ type: 'text'; text: string }>
  structuredContent: z.infer<typeof OutputSchema>
}

type AppTuple = {
  id: `0x${string}`
  teamWalletAddress: `0x${string}`
  name: string
  metadataURI: string
  createdAtTimestamp: bigint
  appAvailableForAllocationVoting: boolean
}

export const getVeBetterDaoApps: MCPTool = {
  name: 'getVeBetterDaoApps',
  title: 'VeBetterDAO: list xApps with on-chain status, roles and IPFS metadata',
  description:
    'List VeBetterDAO xApps directly from the on-chain X2EarnApps registry. For each app returns: id, on-chain name, owner (teamWalletAddress), createdAtTimestamp, roles (admin, moderators, creators, rewardDistributors), endorsement status (isEndorsed, endorsementScore vs threshold, isUnendorsed/grace period, isBlacklisted, isEligibleNow), whether the app is active in the current XAllocationVoting round, and IPFS metadata (description, website, logo, banner, social links, categories, distribution_strategy). Supports filtering to a single appId, to apps active in the current round, and by category (array of category ids, case-insensitive, OR semantics — sourced from IPFS metadata). Uses the VeChain SDK multicall for efficiency.',
  inputSchema: InputSchema.shape,
  outputSchema: OutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (params: Input): Promise<GetVeBetterDaoAppsResponse> => {
    const network = getThorNetworkType()
    try {
      const parsed = InputSchema.parse(params ?? {})
      const categoryFilter =
        parsed.categories && parsed.categories.length > 0 ? new Set(parsed.categories.map(c => c.toLowerCase())) : null
      // Categories live in IPFS metadata: force the fetch when a category filter is active
      const needsMetadata = parsed.includeMetadata || categoryFilter !== null

      const { x2EarnApps, xAllocationVoting } = getVeBetterDaoContractAddresses()
      const x2EarnAppsContract = getX2EarnAppsContract()
      const xAllocationVotingContract = getXAllocationVotingContract()

      // ---------- Step 1: global config + apps lists + current round ----------
      const globalClauses: ContractClause[] = [
        x2EarnAppsContract.clause.apps(),
        x2EarnAppsContract.clause.unendorsedApps(),
        x2EarnAppsContract.clause.baseURI(),
        x2EarnAppsContract.clause.endorsementScoreThreshold(),
        x2EarnAppsContract.clause.gracePeriod(),
        x2EarnAppsContract.clause.cooldownPeriod(),
        x2EarnAppsContract.clause.endorsementsPaused(),
        xAllocationVotingContract.clause.currentRoundId(),
      ]
      const globalResults = await executeMulticall(globalClauses)
      if (!globalResults) {
        return errorResp('Failed to fetch VeBetterDAO global state')
      }

      const endorsedApps = unwrapPlain<readonly AppTuple[]>(globalResults[0], [])
      const unendorsedAppsList = unwrapPlain<readonly AppTuple[]>(globalResults[1], [])
      const baseURI = unwrapPlain<string>(globalResults[2], '')
      const endorsementScoreThreshold = unwrapPlain<bigint>(globalResults[3], 0n)
      const gracePeriod = unwrapPlain<bigint>(globalResults[4], 0n)
      const cooldownPeriod = unwrapPlain<bigint>(globalResults[5], 0n)
      const endorsementsPaused = unwrapPlain<boolean>(globalResults[6], false)
      const currentRoundResult = globalResults[7]
      const currentRoundId = currentRoundResult?.success ? (currentRoundResult.result.plain as bigint) : null

      // Combine endorsed + (optionally) unendorsed; dedupe by id
      const byId = new Map<string, AppTuple>()
      for (const a of endorsedApps) byId.set(a.id.toLowerCase(), a)
      if (parsed.includeUnendorsed) {
        for (const a of unendorsedAppsList) {
          const k = a.id.toLowerCase()
          if (!byId.has(k)) byId.set(k, a)
        }
      }

      let appsToProcess = Array.from(byId.values())
      if (parsed.appId) {
        const target = parsed.appId.toLowerCase()
        appsToProcess = appsToProcess.filter(a => a.id.toLowerCase() === target)
      }

      // ---------- Step 2: current-round app ids ----------
      let activeRoundIds = new Set<string>()
      if (currentRoundId !== null) {
        const roundResults = await executeMulticall([xAllocationVotingContract.clause.getAppIdsOfRound(currentRoundId)])
        const ids = roundResults ? unwrapPlain<readonly `0x${string}`[] | null>(roundResults[0], null) : null
        if (ids) activeRoundIds = new Set(ids.map(x => x.toLowerCase()))
      }

      if (parsed.onlyActiveInCurrentRound) {
        appsToProcess = appsToProcess.filter(a => activeRoundIds.has(a.id.toLowerCase()))
      }

      // ---------- Step 3: per-app multicall for status + roles ----------
      const perAppClauses: ContractClause[] = appsToProcess.flatMap(app => {
        const c: ContractClause[] = [
          x2EarnAppsContract.clause.isBlacklisted(app.id),
          x2EarnAppsContract.clause.isAppUnendorsed(app.id),
          x2EarnAppsContract.clause.isEligibleNow(app.id),
          x2EarnAppsContract.clause.getScore(app.id),
        ]
        if (parsed.includeRoles) {
          c.push(
            x2EarnAppsContract.clause.appAdmin(app.id),
            x2EarnAppsContract.clause.appModerators(app.id),
            x2EarnAppsContract.clause.appCreators(app.id),
            x2EarnAppsContract.clause.rewardDistributors(app.id),
          )
        }
        if (parsed.includeEndorsers) {
          c.push(x2EarnAppsContract.clause.getEndorsers(app.id))
        }
        return c
      })
      const stride = 4 + (parsed.includeRoles ? 4 : 0) + (parsed.includeEndorsers ? 1 : 0)
      const perAppResults = (await executeMulticall(perAppClauses)) ?? []

      // ---------- Step 4: IPFS metadata (concurrent) ----------
      const metadataUrls = appsToProcess.map(a => resolveMetadataUrl(baseURI, a.metadataURI))
      const metadataObjs: (z.infer<typeof XAppMetadataSchema> | null)[] = needsMetadata
        ? await mapWithConcurrency(metadataUrls, parsed.metadataConcurrency, async url => {
            if (!url) return null
            const raw = await fetchJson(url)
            if (!raw || typeof raw !== 'object') return null
            const parsedMeta = XAppMetadataSchema.safeParse(raw)
            return parsedMeta.success ? parsedMeta.data : (raw as z.infer<typeof XAppMetadataSchema>)
          })
        : appsToProcess.map(() => null)

      // ---------- Step 5: assemble output ----------
      const allApps = appsToProcess.map((app, i) => {
        const base = i * stride
        const idLc = app.id.toLowerCase()

        let offset = 0
        const isBlacklisted = unwrapPlain<boolean>(perAppResults[base + offset++], false)
        const isUnendorsed = unwrapPlain<boolean>(perAppResults[base + offset++], false)
        const isEligibleNow = unwrapPlain<boolean>(perAppResults[base + offset++], false)
        const endorsementScore = unwrapPlain<bigint>(perAppResults[base + offset++], 0n)

        let admin: string | null = null
        let moderators: string[] = []
        let creators: string[] = []
        let rewardDistributors: string[] = []
        let endorsers: string[] | undefined

        if (parsed.includeRoles) {
          admin = unwrapPlain<string | null>(perAppResults[base + offset++], null)
          moderators = [...unwrapPlain<readonly string[]>(perAppResults[base + offset++], [])]
          creators = [...unwrapPlain<readonly string[]>(perAppResults[base + offset++], [])]
          rewardDistributors = [...unwrapPlain<readonly string[]>(perAppResults[base + offset++], [])]
        }
        if (parsed.includeEndorsers) {
          endorsers = [...unwrapPlain<readonly string[]>(perAppResults[base + offset++], [])]
        }

        const isActiveInCurrentRound = activeRoundIds.has(idLc)
        const isEndorsed = endorsementScore >= endorsementScoreThreshold && !isBlacklisted && !isUnendorsed

        const meta = metadataObjs[i]
        const description = meta?.description ?? null
        const website = meta?.external_url ?? null
        const logo = ipfsToHttp(meta?.logo) ?? null
        const banner = ipfsToHttp(meta?.banner) ?? null
        const categories = meta?.categories
        const socials = meta?.social_urls

        return {
          id: app.id,
          name: app.name,
          teamWalletAddress: app.teamWalletAddress,
          metadataURI: app.metadataURI,
          metadataUrl: metadataUrls[i],
          createdAtTimestamp: app.createdAtTimestamp.toString(),
          description,
          website,
          logo,
          banner,
          ...(categories ? { categories } : {}),
          ...(socials ? { socials } : {}),
          roles: {
            admin,
            moderators,
            creators,
            rewardDistributors,
            ...(endorsers ? { endorsers } : {}),
          },
          status: {
            appAvailableForAllocationVoting: app.appAvailableForAllocationVoting,
            isBlacklisted,
            isUnendorsed,
            isEligibleNow,
            isActiveInCurrentRound,
            endorsementScore: endorsementScore.toString(),
            endorsementScoreThreshold: endorsementScoreThreshold.toString(),
            isEndorsed,
          },
          metadata: meta ?? null,
        }
      })

      const apps = categoryFilter
        ? allApps.filter(a => {
            const appCats = a.categories ?? a.metadata?.categories
            if (!appCats || appCats.length === 0) return false
            return appCats.some(c => categoryFilter.has(c.toLowerCase()))
          })
        : allApps

      const data = {
        network,
        contracts: { x2EarnApps, xAllocationVoting },
        globalConfig: {
          currentRoundId: currentRoundId !== null ? currentRoundId.toString() : null,
          endorsementScoreThreshold: endorsementScoreThreshold.toString(),
          gracePeriod: gracePeriod.toString(),
          cooldownPeriod: cooldownPeriod.toString(),
          endorsementsPaused,
        },
        totalCount: apps.length,
        endorsedCount: apps.filter(a => a.status.isEndorsed).length,
        unendorsedCount: apps.filter(a => a.status.isUnendorsed).length,
        blacklistedCount: apps.filter(a => a.status.isBlacklisted).length,
        activeInCurrentRoundCount: apps.filter(a => a.status.isActiveInCurrentRound).length,
        apps,
      }

      const result = { ok: true, network, data }
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result,
      }
    } catch (error) {
      logger.warn(`Error in getVeBetterDaoApps: ${String(error)}`)
      return errorResp(`Error in getVeBetterDaoApps: ${String(error)}`)
    }

    function errorResp(msg: string): GetVeBetterDaoAppsResponse {
      const r = { ok: false, network, error: msg }
      return {
        content: [{ type: 'text', text: JSON.stringify(r) }],
        structuredContent: r,
      }
    }
  },
}
