import { DEMO_ACCOUNTS, DEMO_USER, demoApi } from './demo'
import { createGraphClient, fetchAdAccounts, fetchEntities, fetchInsights, fetchMe } from './meta/api'
import type { AdAccount, EntityStatus, InsightRow, InsightsQuery, MetaUser } from './types'

export interface DataSource {
  kind: 'demo' | 'meta'
  me(signal?: AbortSignal): Promise<MetaUser>
  accounts(signal?: AbortSignal): Promise<AdAccount[]>
  insights(q: InsightsQuery, signal?: AbortSignal): Promise<InsightRow[]>
  entities(accountId: string, level: 'campaign' | 'adset' | 'ad', currency: string, signal?: AbortSignal): Promise<EntityStatus[]>
}

export function createMetaSource(token: string, apiVersion?: string): DataSource {
  const client = createGraphClient(token, apiVersion)
  return {
    kind: 'meta',
    me: (signal) => fetchMe(client, signal),
    accounts: (signal) => fetchAdAccounts(client, signal),
    insights: (q, signal) => fetchInsights(client, q, signal),
    entities: (accountId, level, currency, signal) => fetchEntities(client, accountId, level, currency, signal),
  }
}

export const demoSource: DataSource = {
  kind: 'demo',
  me: async () => DEMO_USER,
  accounts: async () => DEMO_ACCOUNTS,
  insights: (q) => demoApi.insights(q),
  entities: (_a, level) => demoApi.entities(level),
}
