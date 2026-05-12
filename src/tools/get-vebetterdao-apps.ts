import { z } from 'zod'
import { encodeFunctionData, decodeFunctionResult } from 'viem'
import { getThorNetworkType } from '@/services/thor'
import {
  X2EARN_APPS_VIEW_ABI,
  X_ALLOCATION_VOTING_VIEW_ABI,
  getVeBetterDaoContractAddresses,
  inspectClauses,
  type InspectClauseResult,
} from '@/services/vebetterdao-contracts'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const IPFS_GATEWAY = 'https://api.gateway-proxy.vechain.org/ipfs'

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
  appAvailableForAllocationVoting: z
    .boolean()
    .describe('On-chain flag from the App tuple'),
  isBlacklisted: z.boolean(),
  isUnendorsed: z
    .boolean()
    .describe('True if the app lost endorsement and is in grace period'),
  isEligibleNow: z
    .boolean()
    .describe('True if currently eligible for receiving votes'),
  isActiveInCurrentRound: z
    .boolean()
    .describe('True if the appId is in XAllocationVoting.getAppIdsOfRound(currentRoundId)'),
  endorsementScore: z
    .string()
    .describe('Total endorsement points (uint256 as decimal string)'),
  endorsementScoreThreshold: z
    .string()
    .describe('Min endorsement points to be considered endorsed'),
  isEndorsed: z
    .boolean()
    .describe('Derived: score >= threshold AND not blacklisted AND not unendorsed'),
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

function ipfsToHttp(uri: string | undefined | null): string | null {
  if (!uri) return null
  if (uri.startsWith('ipfs://')) {
    return `${IPFS_GATEWAY}/${uri.slice('ipfs://'.length)}`
  }
  if (uri.startsWith('http://') || uri.startsWith('https://')) return uri
  return `${IPFS_GATEWAY}/${uri.replace(/^\/+/, '')}`
}

function resolveMetadataUrl(baseURI: string, metadataURI: string): string | null {
  if (!metadataURI) return null
  if (metadataURI.startsWith('ipfs://') || metadataURI.startsWith('http')) {
    return ipfsToHttp(metadataURI)
  }
  const base = baseURI ?? ''
  const sep = base.endsWith('/') || metadataURI.startsWith('/') ? '' : '/'
  return ipfsToHttp(`${base}${sep}${metadataURI}`)
}

function decodeOrNull<TOut>(
  result: InspectClauseResult | undefined,
  decoder: () => TOut,
): TOut | null {
  if (!result || result.reverted || !result.data || result.data === '0x') return null
  try {
    return decoder()
  } catch (e) {
    logger.debug(`decode failed: ${String(e)}`)
    return null
  }
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json, text/plain, */*' },
    })
    if (!res.ok) return null
    const text = await res.text()
    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  } catch {
    return null
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (true) {
      const idx = i++
      if (idx >= items.length) return
      out[idx] = await fn(items[idx], idx)
    }
  })
  await Promise.all(workers)
  return out
}

export const getVeBetterDaoApps: MCPTool = {
  name: 'getVeBetterDaoApps',
  title: 'VeBetterDAO: list xApps with on-chain status, roles and IPFS metadata',
  description:
    'List VeBetterDAO xApps directly from the on-chain X2EarnApps registry. For each app returns: id, on-chain name, owner (teamWalletAddress), createdAtTimestamp, roles (admin, moderators, creators, rewardDistributors), endorsement status (isEndorsed, endorsementScore vs threshold, isUnendorsed/grace period, isBlacklisted, isEligibleNow), whether the app is active in the current XAllocationVoting round, and IPFS metadata (description, website, logo, banner, social links, categories, distribution_strategy). Supports filtering to a single appId or to apps active in the current round. Uses Thor `POST /accounts/*` multicall for efficiency.',
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
      const { x2EarnApps, xAllocationVoting } = getVeBetterDaoContractAddresses()

      // ---------- Step 1: global config + apps lists + current round ----------
      const globalClauses = [
        {
          to: x2EarnApps,
          data: encodeFunctionData({ abi: X2EARN_APPS_VIEW_ABI, functionName: 'apps' }),
        },
        {
          to: x2EarnApps,
          data: encodeFunctionData({ abi: X2EARN_APPS_VIEW_ABI, functionName: 'unendorsedApps' }),
        },
        {
          to: x2EarnApps,
          data: encodeFunctionData({ abi: X2EARN_APPS_VIEW_ABI, functionName: 'baseURI' }),
        },
        {
          to: x2EarnApps,
          data: encodeFunctionData({
            abi: X2EARN_APPS_VIEW_ABI,
            functionName: 'endorsementScoreThreshold',
          }),
        },
        {
          to: x2EarnApps,
          data: encodeFunctionData({ abi: X2EARN_APPS_VIEW_ABI, functionName: 'gracePeriod' }),
        },
        {
          to: x2EarnApps,
          data: encodeFunctionData({ abi: X2EARN_APPS_VIEW_ABI, functionName: 'cooldownPeriod' }),
        },
        {
          to: x2EarnApps,
          data: encodeFunctionData({
            abi: X2EARN_APPS_VIEW_ABI,
            functionName: 'endorsementsPaused',
          }),
        },
        {
          to: xAllocationVoting,
          data: encodeFunctionData({
            abi: X_ALLOCATION_VOTING_VIEW_ABI,
            functionName: 'currentRoundId',
          }),
        },
      ]
      const globalResults = await inspectClauses(globalClauses)
      if (!globalResults) {
        return errorResp('Failed to fetch VeBetterDAO global state')
      }

      const endorsedApps =
        decodeOrNull<readonly AppTuple[]>(globalResults[0], () =>
          decodeFunctionResult({
            abi: X2EARN_APPS_VIEW_ABI,
            functionName: 'apps',
            data: globalResults[0].data as `0x${string}`,
          }) as unknown as readonly AppTuple[],
        ) ?? []
      const unendorsedAppsList =
        decodeOrNull<readonly AppTuple[]>(globalResults[1], () =>
          decodeFunctionResult({
            abi: X2EARN_APPS_VIEW_ABI,
            functionName: 'unendorsedApps',
            data: globalResults[1].data as `0x${string}`,
          }) as unknown as readonly AppTuple[],
        ) ?? []
      const baseURI =
        decodeOrNull<string>(globalResults[2], () =>
          decodeFunctionResult({
            abi: X2EARN_APPS_VIEW_ABI,
            functionName: 'baseURI',
            data: globalResults[2].data as `0x${string}`,
          }) as unknown as string,
        ) ?? ''
      const endorsementScoreThreshold =
        decodeOrNull<bigint>(globalResults[3], () =>
          decodeFunctionResult({
            abi: X2EARN_APPS_VIEW_ABI,
            functionName: 'endorsementScoreThreshold',
            data: globalResults[3].data as `0x${string}`,
          }) as unknown as bigint,
        ) ?? 0n
      const gracePeriod =
        decodeOrNull<bigint>(globalResults[4], () =>
          decodeFunctionResult({
            abi: X2EARN_APPS_VIEW_ABI,
            functionName: 'gracePeriod',
            data: globalResults[4].data as `0x${string}`,
          }) as unknown as bigint,
        ) ?? 0n
      const cooldownPeriod =
        decodeOrNull<bigint>(globalResults[5], () =>
          decodeFunctionResult({
            abi: X2EARN_APPS_VIEW_ABI,
            functionName: 'cooldownPeriod',
            data: globalResults[5].data as `0x${string}`,
          }) as unknown as bigint,
        ) ?? 0n
      const endorsementsPaused =
        decodeOrNull<boolean>(globalResults[6], () =>
          decodeFunctionResult({
            abi: X2EARN_APPS_VIEW_ABI,
            functionName: 'endorsementsPaused',
            data: globalResults[6].data as `0x${string}`,
          }) as unknown as boolean,
        ) ?? false
      const currentRoundId = decodeOrNull<bigint>(globalResults[7], () =>
        decodeFunctionResult({
          abi: X_ALLOCATION_VOTING_VIEW_ABI,
          functionName: 'currentRoundId',
          data: globalResults[7].data as `0x${string}`,
        }) as unknown as bigint,
      )

      // Combine endorsed + (optionally) unendorsed; dedupe by id
      const byId = new Map<string, AppTuple>()
      for (const a of endorsedApps) byId.set(a.id.toLowerCase(), a)
      if (parsed.includeUnendorsed) {
        for (const a of unendorsedAppsList) {
          const k = a.id.toLowerCase()
          if (!byId.has(k)) byId.set(k, a)
        }
      }

      // Filter to a single appId if requested
      let universe = Array.from(byId.values())
      if (parsed.appId) {
        const target = parsed.appId.toLowerCase()
        universe = universe.filter(a => a.id.toLowerCase() === target)
      }

      // ---------- Step 2: current-round app ids ----------
      let activeRoundIds = new Set<string>()
      if (currentRoundId !== null) {
        const roundResults = await inspectClauses([
          {
            to: xAllocationVoting,
            data: encodeFunctionData({
              abi: X_ALLOCATION_VOTING_VIEW_ABI,
              functionName: 'getAppIdsOfRound',
              args: [currentRoundId],
            }),
          },
        ])
        const ids = roundResults
          ? decodeOrNull<readonly `0x${string}`[]>(roundResults[0], () =>
              decodeFunctionResult({
                abi: X_ALLOCATION_VOTING_VIEW_ABI,
                functionName: 'getAppIdsOfRound',
                data: roundResults[0].data as `0x${string}`,
              }) as unknown as readonly `0x${string}`[],
            )
          : null
        if (ids) activeRoundIds = new Set(ids.map(x => x.toLowerCase()))
      }

      if (parsed.onlyActiveInCurrentRound) {
        universe = universe.filter(a => activeRoundIds.has(a.id.toLowerCase()))
      }

      // ---------- Step 3: per-app multicall for status + roles ----------
      type PerAppCall =
        | 'isBlacklisted'
        | 'isAppUnendorsed'
        | 'isEligibleNow'
        | 'getScore'
        | 'appAdmin'
        | 'appModerators'
        | 'appCreators'
        | 'rewardDistributors'
        | 'getEndorsers'

      const perAppFns: PerAppCall[] = ['isBlacklisted', 'isAppUnendorsed', 'isEligibleNow', 'getScore']
      if (parsed.includeRoles) {
        perAppFns.push('appAdmin', 'appModerators', 'appCreators', 'rewardDistributors')
      }
      if (parsed.includeEndorsers) perAppFns.push('getEndorsers')

      const perAppClauses = universe.flatMap(app =>
        perAppFns.map(fn => ({
          to: x2EarnApps,
          data: encodeFunctionData({
            abi: X2EARN_APPS_VIEW_ABI,
            functionName: fn,
            args: [app.id],
          }),
        })),
      )

      const perAppResults = (await inspectClauses(perAppClauses)) ?? []

      // ---------- Step 4: IPFS metadata (concurrent) ----------
      const metadataUrls = universe.map(a => resolveMetadataUrl(baseURI, a.metadataURI))
      const metadataObjs: (z.infer<typeof XAppMetadataSchema> | null)[] = parsed.includeMetadata
        ? await mapWithConcurrency(metadataUrls, parsed.metadataConcurrency, async url => {
            if (!url) return null
            const raw = await fetchJson(url)
            if (!raw || typeof raw !== 'object') return null
            const parsedMeta = XAppMetadataSchema.safeParse(raw)
            return parsedMeta.success ? parsedMeta.data : (raw as z.infer<typeof XAppMetadataSchema>)
          })
        : universe.map(() => null)

      // ---------- Step 5: assemble output ----------
      const apps = universe.map((app, i) => {
        const base = i * perAppFns.length
        const idLc = app.id.toLowerCase()

        let isBlacklisted = false
        let isUnendorsed = false
        let isEligibleNow = false
        let endorsementScore = 0n
        let admin: string | null = null
        let moderators: string[] = []
        let creators: string[] = []
        let rewardDistributors: string[] = []
        let endorsers: string[] | undefined

        const decode = <TOut>(offset: number, fn: PerAppCall, fallback: TOut): TOut => {
          const r = perAppResults[base + offset]
          return (
            decodeOrNull<TOut>(r, () =>
              decodeFunctionResult({
                abi: X2EARN_APPS_VIEW_ABI,
                functionName: fn,
                data: r.data as `0x${string}`,
              }) as unknown as TOut,
            ) ?? fallback
          )
        }

        let offset = 0
        isBlacklisted = decode(offset++, 'isBlacklisted', false)
        isUnendorsed = decode(offset++, 'isAppUnendorsed', false)
        isEligibleNow = decode(offset++, 'isEligibleNow', false)
        endorsementScore = decode<bigint>(offset++, 'getScore', 0n)
        if (parsed.includeRoles) {
          admin = decode<string | null>(offset++, 'appAdmin', null)
          moderators = decode<readonly string[]>(offset++, 'appModerators', []).slice() as string[]
          creators = decode<readonly string[]>(offset++, 'appCreators', []).slice() as string[]
          rewardDistributors = decode<readonly string[]>(
            offset++,
            'rewardDistributors',
            [],
          ).slice() as string[]
        }
        if (parsed.includeEndorsers) {
          endorsers = decode<readonly string[]>(offset++, 'getEndorsers', []).slice() as string[]
        }

        const isActiveInCurrentRound = activeRoundIds.has(idLc)
        const isEndorsed =
          endorsementScore >= endorsementScoreThreshold && !isBlacklisted && !isUnendorsed

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
