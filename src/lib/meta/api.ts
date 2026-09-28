import { apiBreakdowns, parseRow } from './parse'
import type { AdAccount, EntityStatus, InsightRow, InsightsQuery, MetaUser, RawInsightRow } from '../types'

export const DEFAULT_API_VERSION: string = import.meta.env.VITE_META_API_VERSION || 'v23.0'
const GRAPH = 'https://graph.facebook.com'

export class MetaApiError extends Error {
  code?: number
  subcode?: number
  type?: string
  fbtraceId?: string

  constructor(message: string, info: { code?: number; subcode?: number; type?: string; fbtraceId?: string } = {}) {
    super(message)
    this.name = 'MetaApiError'
    Object.assign(this, info)
  }

  /** Token expired, revoked or missing permissions. */
  get isAuth() {
    return this.code === 190 || this.code === 102 || this.code === 10 || (this.code !== undefined && this.code >= 200 && this.code < 300)
  }

  get isRateLimit() {
    return [4, 17, 32, 613, 80000, 80003, 80004, 80014].includes(this.code ?? -1)
  }

  get friendly(): string {
    if (this.code === 190) return 'Your Meta access token is invalid or has expired. Please reconnect.'
    if (this.isAuth) return `Missing permission: make sure the token has the ads_read scope. (${this.message})`
    if (this.isRateLimit) return 'Meta is rate-limiting requests for this account. Wait a few minutes and refresh.'
    return this.message
  }
}

interface GraphErrorBody {
  error?: { message: string; type?: string; code?: number; error_subcode?: number; fbtrace_id?: string; error_user_msg?: string }
}

interface Paged<T> {
  data: T[]
  paging?: { next?: string }
}

export interface GraphClient {
  get<T>(path: string, params?: Record<string, string>, signal?: AbortSignal): Promise<T>
  getAll<T>(path: string, params?: Record<string, string>, signal?: AbortSignal, maxPages?: number): Promise<T[]>
}

export function createGraphClient(token: string, version = DEFAULT_API_VERSION): GraphClient {
  async function request<T>(url: string, signal?: AbortSignal): Promise<T> {
    let res: Response
    try {
      res = await fetch(url, { signal })
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e
      throw new MetaApiError('Network error – could not reach graph.facebook.com.')
    }
    const body = (await res.json().catch(() => ({}))) as T & GraphErrorBody
    if (!res.ok || body.error) {
      const err = body.error
      throw new MetaApiError(err?.error_user_msg || err?.message || `Request failed (${res.status})`, {
        code: err?.code,
        subcode: err?.error_subcode,
        type: err?.type,
        fbtraceId: err?.fbtrace_id,
      })
    }
    return body
  }

  function buildUrl(path: string, params: Record<string, string> = {}) {
    const url = new URL(`${GRAPH}/${version}/${path.replace(/^\//, '')}`)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    url.searchParams.set('access_token', token)
    return url.toString()
  }

  return {
    get: (path, params, signal) => request(buildUrl(path, params), signal),
    async getAll<T>(path: string, params: Record<string, string> = {}, signal?: AbortSignal, maxPages = 50) {
      const out: T[] = []
      let next: string | undefined = buildUrl(path, params)
      for (let page = 0; next && page < maxPages; page++) {
        const body: Paged<T> = await request<Paged<T>>(next, signal)
        out.push(...body.data)
        next = body.paging?.next
      }
      return out
    },
  }
}

export const INSIGHT_FIELDS = [
  'account_currency',
  'spend',
  'impressions',
  'reach',
  'clicks',
  'inline_link_clicks',
  'actions',
  'action_values',
  'video_thruplay_watched_actions',
]

const LEVEL_FIELDS: Record<string, string[]> = {
  account: [],
  campaign: ['campaign_id', 'campaign_name'],
  adset: ['campaign_id', 'campaign_name', 'adset_id', 'adset_name'],
  ad: ['campaign_id', 'campaign_name', 'adset_id', 'adset_name', 'ad_id', 'ad_name'],
}

/** Graph API params for an insights query (exported for tests). */
export function insightsParams(q: InsightsQuery): Record<string, string> {
  const params: Record<string, string> = {
    level: q.level,
    fields: [...INSIGHT_FIELDS, ...LEVEL_FIELDS[q.level]].join(','),
    time_range: JSON.stringify({ since: q.range.since, until: q.range.until }),
    limit: '500',
  }
  if (q.daily) params.time_increment = '1'
  if (q.breakdown) params.breakdowns = apiBreakdowns(q.breakdown)
  const filtering: { field: string; operator: string; value: string[] }[] = []
  if (q.campaignIds?.length) filtering.push({ field: 'campaign.id', operator: 'IN', value: q.campaignIds })
  // effective_status is ACTIVE only when the ad and its ad set and campaign are all on.
  if (q.activeOnly) filtering.push({ field: 'ad.effective_status', operator: 'IN', value: ['ACTIVE'] })
  if (filtering.length) params.filtering = JSON.stringify(filtering)
  return params
}

export async function fetchMe(client: GraphClient, signal?: AbortSignal): Promise<MetaUser> {
  return client.get<MetaUser>('me', { fields: 'id,name' }, signal)
}

interface RawAccount {
  id: string
  account_id: string
  name: string
  currency: string
  timezone_name: string
  account_status: number
}

export async function fetchAdAccounts(client: GraphClient, signal?: AbortSignal): Promise<AdAccount[]> {
  const rows = await client.getAll<RawAccount>(
    'me/adaccounts',
    { fields: 'id,account_id,name,currency,timezone_name,account_status', limit: '200' },
    signal,
    10,
  )
  return rows.map((r) => ({
    id: r.id,
    accountId: r.account_id,
    name: r.name || r.account_id,
    currency: r.currency,
    timezone: r.timezone_name,
    status: r.account_status,
  }))
}

export async function fetchInsights(client: GraphClient, q: InsightsQuery, signal?: AbortSignal): Promise<InsightRow[]> {
  const raw = await client.getAll<RawInsightRow>(`${q.accountId}/insights`, insightsParams(q), signal)
  return raw.map((r) => parseRow(r, q.level, { daily: q.daily, breakdown: q.breakdown }))
}

const ZERO_DECIMAL_CURRENCIES = new Set(['CLP', 'COP', 'CRC', 'HUF', 'ISK', 'IDR', 'JPY', 'KRW', 'PYG', 'TWD', 'VND'])

interface RawEntity {
  id: string
  name: string
  effective_status: string
  objective?: string
  daily_budget?: string
  lifetime_budget?: string
}

export async function fetchEntities(
  client: GraphClient,
  accountId: string,
  level: 'campaign' | 'adset' | 'ad',
  currency = 'USD',
  signal?: AbortSignal,
): Promise<EntityStatus[]> {
  const edge = level === 'campaign' ? 'campaigns' : level === 'adset' ? 'adsets' : 'ads'
  const fields = level === 'ad' ? 'id,name,effective_status' : 'id,name,effective_status,daily_budget,lifetime_budget' + (level === 'campaign' ? ',objective' : '')
  const rows = await client.getAll<RawEntity>(`${accountId}/${edge}`, { fields, limit: '500' }, signal, 20)
  // Budgets are returned in the currency's minor unit (cents), except for
  // currencies Meta treats as having no minor unit.
  const offset = ZERO_DECIMAL_CURRENCIES.has(currency) ? 1 : 100
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.effective_status,
    objective: r.objective,
    dailyBudget: r.daily_budget ? Number(r.daily_budget) / offset : undefined,
    lifetimeBudget: r.lifetime_budget ? Number(r.lifetime_budget) / offset : undefined,
  }))
}

export const ACCOUNT_STATUS: Record<number, string> = {
  1: 'Active',
  2: 'Disabled',
  3: 'Unsettled',
  7: 'Pending risk review',
  8: 'Pending settlement',
  9: 'In grace period',
  100: 'Pending closure',
  101: 'Closed',
  201: 'Active',
  202: 'Closed',
}
