import { withCanonicalEvents } from '../events'
import type { BreakdownKey, InsightRow, Level, RawAction, RawInsightRow } from '../types'

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : 0
}

function actionMap(list: RawAction[] | undefined): Record<string, number> {
  const out: Record<string, number> = {}
  for (const a of list ?? []) out[a.action_type] = (out[a.action_type] ?? 0) + num(a.value)
  return out
}

const PRETTY: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  audience_network: 'Audience Network',
  messenger: 'Messenger',
  threads: 'Threads',
  whatsapp: 'WhatsApp',
  mobile_app: 'Mobile app',
  mobile_web: 'Mobile web',
  desktop: 'Desktop',
  unknown: 'Unknown',
  male: 'Male',
  female: 'Female',
  feed: 'Feed',
  instagram_stories: 'Stories',
  instagram_reels: 'Reels',
  facebook_reels: 'Reels',
  facebook_stories: 'Stories',
  instagram_explore: 'Explore',
  instream_video: 'In-stream video',
  marketplace: 'Marketplace',
  video_feeds: 'Video feeds',
  right_hand_column: 'Right column',
  search: 'Search',
  an_classic: 'Native, banner & interstitial',
  rewarded_video: 'Rewarded video',
  messenger_inbox: 'Inbox',
}

let regionNames: Intl.DisplayNames | undefined
function countryName(code: string): string {
  try {
    regionNames ??= new Intl.DisplayNames(undefined, { type: 'region' })
    return regionNames.of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}

export function prettyDimension(value: string, breakdown?: BreakdownKey): string {
  if (!value) return 'Unknown'
  if (breakdown === 'country' && /^[A-Za-z]{2}$/.test(value)) return countryName(value)
  if (PRETTY[value]) return PRETTY[value]
  const s = value.replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** The Graph API `breakdowns` param for a breakdown key. */
export function apiBreakdowns(b: BreakdownKey): string {
  // platform_position must be requested together with publisher_platform.
  return b === 'platform_position' ? 'publisher_platform,platform_position' : b
}

function breakdownValue(raw: RawInsightRow, b: BreakdownKey): { key: string; name: string } {
  if (b === 'platform_position') {
    const p = String(raw.publisher_platform ?? '')
    const pos = String(raw.platform_position ?? '')
    return { key: `${p}:${pos}`, name: `${prettyDimension(p)} · ${prettyDimension(pos)}` }
  }
  const v = String(raw[b] ?? 'unknown')
  return { key: v, name: prettyDimension(v, b) }
}

/** Normalize one Graph API insights row. */
export function parseRow(raw: RawInsightRow, level: Level, opts: { daily?: boolean; breakdown?: BreakdownKey } = {}): InsightRow {
  const actions = actionMap(raw.actions)
  const thruplay = actionMap(raw.video_thruplay_watched_actions)
  const thruplays = Object.values(thruplay).reduce((a, b) => a + b, 0)
  if (thruplays) actions.video_thruplay = thruplays

  const row: InsightRow = {
    key: '',
    name: '',
    date: raw.date_start,
    dateStop: raw.date_stop,
    spend: num(raw.spend),
    impressions: num(raw.impressions),
    reach: num(raw.reach),
    clicks: num(raw.clicks),
    linkClicks: raw.inline_link_clicks !== undefined ? num(raw.inline_link_clicks) : (actions.link_click ?? 0),
    actions: withCanonicalEvents(actions),
    actionValues: withCanonicalEvents(actionMap(raw.action_values)),
    campaignId: raw.campaign_id,
    campaignName: raw.campaign_name,
    adsetId: raw.adset_id,
    adsetName: raw.adset_name,
    adId: raw.ad_id,
    adName: raw.ad_name,
  }

  if (opts.breakdown) {
    const bv = breakdownValue(raw, opts.breakdown)
    row.key = bv.key
    row.name = bv.name
    row.breakdownValue = bv.key
  } else if (level === 'campaign') {
    row.key = raw.campaign_id ?? ''
    row.name = raw.campaign_name ?? raw.campaign_id ?? ''
  } else if (level === 'adset') {
    row.key = raw.adset_id ?? ''
    row.name = raw.adset_name ?? raw.adset_id ?? ''
  } else if (level === 'ad') {
    row.key = raw.ad_id ?? ''
    row.name = raw.ad_name ?? raw.ad_id ?? ''
  } else {
    row.key = raw.date_start
    row.name = 'All campaigns'
  }
  if (opts.daily) row.key = `${row.key}|${raw.date_start}`
  return row
}
