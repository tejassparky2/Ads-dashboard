export type Level = 'account' | 'campaign' | 'adset' | 'ad'

export type BreakdownKey =
  | 'age'
  | 'gender'
  | 'publisher_platform'
  | 'platform_position'
  | 'device_platform'
  | 'impression_device'
  | 'country'
  | 'region'

export interface DateRange {
  /** Inclusive, `yyyy-MM-dd` */
  since: string
  /** Inclusive, `yyyy-MM-dd` */
  until: string
}

export interface InsightsQuery {
  accountId: string
  range: DateRange
  level: Level
  /** One row per day instead of one row for the whole range. */
  daily?: boolean
  breakdown?: BreakdownKey
  /** Restrict to these campaigns (empty / undefined = all). */
  campaignIds?: string[]
}

export interface RawAction {
  action_type: string
  value: string
}

/** A row as returned by the Graph API `/insights` edge. */
export interface RawInsightRow {
  date_start: string
  date_stop: string
  account_currency?: string
  spend?: string
  impressions?: string
  reach?: string
  clicks?: string
  inline_link_clicks?: string
  actions?: RawAction[]
  action_values?: RawAction[]
  video_thruplay_watched_actions?: RawAction[]
  campaign_id?: string
  campaign_name?: string
  adset_id?: string
  adset_name?: string
  ad_id?: string
  ad_name?: string
  [breakdown: string]: unknown
}

/** Additive building blocks every metric is derived from. */
export interface BaseMetrics {
  spend: number
  impressions: number
  reach: number
  clicks: number
  linkClicks: number
  /** Counts keyed by canonical event id (see events.ts) *and* raw action_type. */
  actions: Record<string, number>
  /** Monetary values keyed the same way as `actions`. */
  actionValues: Record<string, number>
}

export interface InsightRow extends BaseMetrics {
  /** Stable key: entity id, date, or breakdown value. */
  key: string
  /** Human label for the row. */
  name: string
  date: string
  dateStop: string
  campaignId?: string
  campaignName?: string
  adsetId?: string
  adsetName?: string
  adId?: string
  adName?: string
  breakdownValue?: string
}

export interface AdAccount {
  /** Graph id, e.g. `act_123` */
  id: string
  accountId: string
  name: string
  currency: string
  timezone: string
  status: number
}

export interface EntityStatus {
  id: string
  name: string
  status: string
  objective?: string
  dailyBudget?: number
  lifetimeBudget?: number
}

export interface MetaUser {
  id: string
  name: string
}
