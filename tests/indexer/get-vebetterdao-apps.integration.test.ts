import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

describe('VeBetterDAO: on-chain apps tool', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'vebetterdao-apps-client', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test(
    'should fetch all VeBetterDAO apps with on-chain status and roles',
    async () => {
      const response = await client.callTool({
        name: 'getVeBetterDaoApps',
        arguments: { includeMetadata: false, includeRoles: true },
      })
      expect(response.content).toBeDefined()
      const sc = (response as any).structuredContent
      expect(typeof sc.ok).toBe('boolean')
      if (!sc.ok) {
        expect(typeof sc.error).toBe('string')
        return
      }

      const d = sc.data
      expect(d.network).toBeDefined()
      expect(d.contracts.x2EarnApps).toMatch(/^0x[0-9a-fA-F]{40}$/)
      expect(d.contracts.xAllocationVoting).toMatch(/^0x[0-9a-fA-F]{40}$/)

      expect(typeof d.globalConfig.endorsementScoreThreshold).toBe('string')
      expect(typeof d.globalConfig.gracePeriod).toBe('string')
      expect(typeof d.globalConfig.cooldownPeriod).toBe('string')
      expect(typeof d.globalConfig.endorsementsPaused).toBe('boolean')

      expect(typeof d.totalCount).toBe('number')
      expect(d.totalCount).toBeGreaterThan(0)
      expect(Array.isArray(d.apps)).toBe(true)

      const sample = d.apps[0]
      expect(sample.id).toMatch(/^0x[0-9a-fA-F]{64}$/)
      expect(typeof sample.name).toBe('string')
      expect(sample.teamWalletAddress).toMatch(/^0x[0-9a-fA-F]{40}$/)
      expect(typeof sample.createdAtTimestamp).toBe('string')

      expect(sample.roles).toBeDefined()
      expect(Array.isArray(sample.roles.moderators)).toBe(true)
      expect(Array.isArray(sample.roles.creators)).toBe(true)
      expect(Array.isArray(sample.roles.rewardDistributors)).toBe(true)

      expect(typeof sample.status.isBlacklisted).toBe('boolean')
      expect(typeof sample.status.isUnendorsed).toBe('boolean')
      expect(typeof sample.status.isEligibleNow).toBe('boolean')
      expect(typeof sample.status.isActiveInCurrentRound).toBe('boolean')
      expect(typeof sample.status.isEndorsed).toBe('boolean')
      expect(typeof sample.status.endorsementScore).toBe('string')
      expect(typeof sample.status.endorsementScoreThreshold).toBe('string')
    },
    60000,
  )

  test(
    'should filter to a single appId when provided',
    async () => {
      const listRes = await client.callTool({
        name: 'getVeBetterDaoApps',
        arguments: { includeMetadata: false, includeRoles: false },
      })
      const listSc = (listRes as any).structuredContent
      if (!listSc.ok || !listSc.data?.apps?.length) {
        return
      }
      const targetId = listSc.data.apps[0].id

      const response = await client.callTool({
        name: 'getVeBetterDaoApps',
        arguments: { appId: targetId, includeMetadata: false, includeRoles: false },
      })
      const sc = (response as any).structuredContent
      expect(sc.ok).toBe(true)
      expect(sc.data.apps).toHaveLength(1)
      expect(sc.data.apps[0].id.toLowerCase()).toBe(targetId.toLowerCase())
    },
    60000,
  )

  test(
    'should return only apps active in the current round when requested',
    async () => {
      const response = await client.callTool({
        name: 'getVeBetterDaoApps',
        arguments: {
          onlyActiveInCurrentRound: true,
          includeMetadata: false,
          includeRoles: false,
        },
      })
      const sc = (response as any).structuredContent
      if (!sc.ok) return
      const d = sc.data
      expect(Array.isArray(d.apps)).toBe(true)
      for (const app of d.apps) {
        expect(app.status.isActiveInCurrentRound).toBe(true)
      }
      expect(d.activeInCurrentRoundCount).toBe(d.apps.length)
    },
    60000,
  )

  test(
    'should filter apps by category (case-insensitive, OR semantics)',
    async () => {
      const response = await client.callTool({
        name: 'getVeBetterDaoApps',
        arguments: {
          categories: ['Nutrition', 'plastic-waste-recycling'],
          includeRoles: false,
          metadataConcurrency: 8,
        },
      })
      const sc = (response as any).structuredContent
      if (!sc.ok) return
      const d = sc.data
      expect(Array.isArray(d.apps)).toBe(true)
      expect(d.totalCount).toBe(d.apps.length)
      const allowed = new Set(['nutrition', 'plastic-waste-recycling'])
      for (const app of d.apps) {
        const cats: string[] = app.categories ?? app.metadata?.categories ?? []
        expect(cats.length).toBeGreaterThan(0)
        expect(cats.some(c => allowed.has(c.toLowerCase()))).toBe(true)
      }
    },
    90000,
  )

  test(
    'should resolve IPFS metadata when includeMetadata is true',
    async () => {
      const response = await client.callTool({
        name: 'getVeBetterDaoApps',
        arguments: { includeMetadata: true, includeRoles: false, metadataConcurrency: 8 },
      })
      const sc = (response as any).structuredContent
      if (!sc.ok || !sc.data?.apps?.length) return

      const withMeta = sc.data.apps.find((a: any) => a.metadata)
      expect(withMeta).toBeDefined()
      expect(withMeta.metadataUrl).toMatch(/^https?:\/\//)
      // typical fields populated by IPFS metadata
      const someStringField =
        withMeta.description ?? withMeta.website ?? withMeta.metadata?.name ?? null
      expect(typeof someStringField).toBe('string')
    },
    90000,
  )
})
