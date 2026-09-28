/**
 * Deterministic demo data shaped exactly like Graph API insights rows, so the
 * whole pipeline (parsing, metrics, charts, export) runs without an account.
 */
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { eachDay } from './dates'
import { parseRow } from './meta/parse'
import type { AdAccount, BreakdownKey, EntityStatus, InsightRow, InsightsQuery, MetaUser, RawInsightRow } from './types'

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Uniform [0,1) seeded by a string. */
function rand(seed: string): number {
  let t = (hash(seed) + 0x6d2b79f5) >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const jitter = (seed: string, spread: number) => 1 + (rand(seed) - 0.5) * 2 * spread

interface Profile {
  budget: number
  cpm: number
  ctr: number
  linkShare: number
  lpv: number
  atc: number
  ic: number
  purchase: number
  aov: number
  lead: number
  video: number
  startDaysAgo: number
  pausedDaysAgo?: number
}

interface DemoCampaign {
  id: string
  name: string
  objective: string
  p: Profile
  adsets: { id: string; name: string; ads: { id: string; name: string }[] }[]
}

const P = (p: Partial<Profile>): Profile => ({
  budget: 150, cpm: 11, ctr: 0.018, linkShare: 0.62, lpv: 0.8, atc: 0.11, ic: 0.5, purchase: 0.62, aov: 84, lead: 0, video: 0.28, startDaysAgo: 400, ...p,
})

const SPEC: [string, string, Profile, string[], string[]][] = [
  ['Prospecting · Advantage+ Shopping', 'OUTCOME_SALES', P({ budget: 420, cpm: 9.5, ctr: 0.016, purchase: 0.65 }), ['Broad · US 18-65+', 'Broad · CA/UK/AU'], ['UGC Unboxing', 'Founder Story', 'Static · Bestsellers']],
  ['Retargeting · Site Visitors 30d', 'OUTCOME_SALES', P({ budget: 160, cpm: 18, ctr: 0.028, atc: 0.16, purchase: 0.85, aov: 90 }), ['Visitors 30d', 'ATC no purchase 14d'], ['Dynamic Carousel', 'Reviews Video']],
  ['Lookalike 1% · Purchasers', 'OUTCOME_SALES', P({ budget: 210, cpm: 12.5, ctr: 0.019, purchase: 0.7, aov: 87 }), ['LAL 1% Purchasers', 'LAL 1-3% High LTV'], ['Before/After Reel', 'Lifestyle Photo']],
  ['Catalog Sales · DPA', 'OUTCOME_SALES', P({ budget: 130, cpm: 14, ctr: 0.024, atc: 0.13, purchase: 0.8, aov: 75 }), ['Viewed products 7d', 'Cross-sell buyers'], ['DPA Frame', 'DPA Collection']],
  ['Lead Gen · Free Guide', 'OUTCOME_LEADS', P({ budget: 90, cpm: 8, ctr: 0.021, atc: 0, ic: 0, purchase: 0.0, lead: 0.14, aov: 0 }), ['Interest · Fitness', 'Interest · Wellness'], ['Guide Mockup', 'Carousel Tips']],
  ['Brand Awareness · Reels', 'OUTCOME_AWARENESS', P({ budget: 75, cpm: 4.2, ctr: 0.007, atc: 0.03, purchase: 0.43, video: 0.41 }), ['Broad · 18-34'], ['Reel · Behind the scenes', 'Reel · Trend Audio']],
  ['Holiday Sale · Carousel', 'OUTCOME_SALES', P({ budget: 260, cpm: 15, ctr: 0.022, purchase: 0.75, aov: 98, startDaysAgo: 60, pausedDaysAgo: 12 }), ['Past buyers 180d', 'Engaged IG 90d'], ['Carousel · 30% off', 'Countdown Story']],
  ['Creative Testing · ABO', 'OUTCOME_SALES', P({ budget: 70, cpm: 10.5, ctr: 0.017, purchase: 0.61 }), ['Test · Hooks A', 'Test · Hooks B'], ['Hook: Problem', 'Hook: Social proof', 'Hook: Offer']],
]

const CAMPAIGNS: DemoCampaign[] = SPEC.map(([name, objective, p, adsets, ads], ci) => {
  const cid = `2385${ci}0000000${ci}`
  return {
    id: cid,
    name,
    objective,
    p,
    adsets: adsets.map((as, ai) => ({
      id: `${cid}${ai}1`,
      name: as,
      ads: ads.map((ad, di) => ({ id: `${cid}${ai}${di}2`, name: `${ad}${adsets.length > 1 ? ` · ${String.fromCharCode(65 + ai)}` : ''}` })),
    })),
  }
})

type M = Record<'spend' | 'impressions' | 'reach' | 'clicks' | 'link' | 'lpv' | 'vc' | 'atc' | 'ic' | 'purchase' | 'revenue' | 'lead' | 'video' | 'thruplay' | 'engagement', number>

const zero = (): M => ({ spend: 0, impressions: 0, reach: 0, clicks: 0, link: 0, lpv: 0, vc: 0, atc: 0, ic: 0, purchase: 0, revenue: 0, lead: 0, video: 0, thruplay: 0, engagement: 0 })

function add(a: M, b: M, f = 1) {
  for (const k of Object.keys(a) as (keyof M)[]) a[k] += b[k] * f
}

const TODAY = new Date()

function adDay(c: DemoCampaign, adId: string, adShare: number, date: string): M {
  const m = zero()
  const ago = differenceInCalendarDays(TODAY, parseISO(date))
  if (ago < 0 || ago > c.p.startDaysAgo) return m
  if (c.p.pausedDaysAgo !== undefined && ago < c.p.pausedDaysAgo) return m
  const d = parseISO(date)
  const dow = [0.86, 1.02, 1.04, 1.0, 0.98, 1.08, 0.92][d.getDay()]
  const season = 1 + 0.18 * Math.sin((d.getMonth() + d.getDate() / 30) * (Math.PI / 6)) + (d.getMonth() === 10 ? 0.35 : 0)
  const growth = 1 + Math.max(0, 120 - ago) / 600
  const k = `${adId}|${date}`
  const eff = jitter(k + 'eff', 0.18)

  m.spend = c.p.budget * adShare * dow * season * growth * jitter(k + 's', 0.22)
  m.impressions = Math.round((m.spend / (c.p.cpm * jitter(k + 'cpm', 0.15))) * 1000)
  m.reach = Math.round(m.impressions / (1.12 + rand(k + 'f') * 0.35))
  m.clicks = Math.round(m.impressions * c.p.ctr * eff)
  m.link = Math.round(m.clicks * c.p.linkShare * jitter(k + 'l', 0.08))
  m.lpv = Math.round(m.link * c.p.lpv * jitter(k + 'lpv', 0.06))
  m.vc = Math.round(m.lpv * 0.72)
  m.atc = Math.round(m.lpv * c.p.atc * eff * jitter(k + 'atc', 0.25))
  m.ic = Math.round(m.atc * c.p.ic * jitter(k + 'ic', 0.2))
  m.purchase = Math.round(m.ic * c.p.purchase * eff * jitter(k + 'p', 0.25))
  m.revenue = +(m.purchase * c.p.aov * jitter(k + 'aov', 0.2)).toFixed(2)
  m.lead = Math.round(m.lpv * c.p.lead * eff * jitter(k + 'lead', 0.25))
  m.video = Math.round(m.impressions * c.p.video * jitter(k + 'v', 0.15))
  m.thruplay = Math.round(m.video * 0.34 * jitter(k + 't', 0.15))
  m.engagement = Math.round(m.clicks * 1.4 + m.video)
  m.spend = +m.spend.toFixed(2)
  return m
}

const BUCKETS: Record<BreakdownKey, { v: Record<string, string>; share: number; perf: number }[]> = {
  age: [
    { v: { age: '18-24' }, share: 0.16, perf: 0.7 },
    { v: { age: '25-34' }, share: 0.31, perf: 1.1 },
    { v: { age: '35-44' }, share: 0.24, perf: 1.2 },
    { v: { age: '45-54' }, share: 0.15, perf: 1.0 },
    { v: { age: '55-64' }, share: 0.09, perf: 0.85 },
    { v: { age: '65+' }, share: 0.05, perf: 0.7 },
  ],
  gender: [
    { v: { gender: 'female' }, share: 0.58, perf: 1.1 },
    { v: { gender: 'male' }, share: 0.39, perf: 0.88 },
    { v: { gender: 'unknown' }, share: 0.03, perf: 0.6 },
  ],
  publisher_platform: [
    { v: { publisher_platform: 'instagram' }, share: 0.52, perf: 1.08 },
    { v: { publisher_platform: 'facebook' }, share: 0.39, perf: 0.97 },
    { v: { publisher_platform: 'audience_network' }, share: 0.06, perf: 0.45 },
    { v: { publisher_platform: 'messenger' }, share: 0.03, perf: 0.7 },
  ],
  platform_position: [
    { v: { publisher_platform: 'instagram', platform_position: 'instagram_reels' }, share: 0.24, perf: 1.05 },
    { v: { publisher_platform: 'instagram', platform_position: 'feed' }, share: 0.17, perf: 1.15 },
    { v: { publisher_platform: 'instagram', platform_position: 'instagram_stories' }, share: 0.11, perf: 0.95 },
    { v: { publisher_platform: 'facebook', platform_position: 'feed' }, share: 0.26, perf: 1.02 },
    { v: { publisher_platform: 'facebook', platform_position: 'facebook_reels' }, share: 0.09, perf: 0.85 },
    { v: { publisher_platform: 'facebook', platform_position: 'marketplace' }, share: 0.04, perf: 0.8 },
    { v: { publisher_platform: 'audience_network', platform_position: 'an_classic' }, share: 0.06, perf: 0.45 },
    { v: { publisher_platform: 'messenger', platform_position: 'messenger_inbox' }, share: 0.03, perf: 0.7 },
  ],
  device_platform: [
    { v: { device_platform: 'mobile_app' }, share: 0.9, perf: 1.0 },
    { v: { device_platform: 'mobile_web' }, share: 0.06, perf: 0.8 },
    { v: { device_platform: 'desktop' }, share: 0.04, perf: 1.35 },
  ],
  impression_device: [
    { v: { impression_device: 'iphone' }, share: 0.55, perf: 1.15 },
    { v: { impression_device: 'android_smartphone' }, share: 0.36, perf: 0.8 },
    { v: { impression_device: 'ipad' }, share: 0.05, perf: 1.1 },
    { v: { impression_device: 'desktop' }, share: 0.04, perf: 1.3 },
  ],
  country: [
    { v: { country: 'US' }, share: 0.62, perf: 1.05 },
    { v: { country: 'CA' }, share: 0.12, perf: 0.95 },
    { v: { country: 'GB' }, share: 0.11, perf: 1.0 },
    { v: { country: 'AU' }, share: 0.09, perf: 0.97 },
    { v: { country: 'NZ' }, share: 0.03, perf: 0.9 },
    { v: { country: 'IE' }, share: 0.03, perf: 0.92 },
  ],
  region: [
    { v: { region: 'California' }, share: 0.18, perf: 1.05 },
    { v: { region: 'Texas' }, share: 0.13, perf: 1.0 },
    { v: { region: 'New York' }, share: 0.11, perf: 1.08 },
    { v: { region: 'Florida' }, share: 0.1, perf: 0.95 },
    { v: { region: 'Ontario' }, share: 0.08, perf: 0.94 },
    { v: { region: 'England' }, share: 0.1, perf: 1.0 },
    { v: { region: 'New South Wales' }, share: 0.06, perf: 0.97 },
    { v: { region: 'Other' }, share: 0.24, perf: 0.9 },
  ],
}

const CONVERSION_KEYS: (keyof M)[] = ['lpv', 'vc', 'atc', 'ic', 'purchase', 'revenue', 'lead']

function toRaw(m: M, since: string, until: string, extra: Record<string, string>): RawInsightRow {
  const a = (t: string, v: number) => ({ action_type: t, value: String(Math.round(v)) })
  const actions = [
    a('link_click', m.link),
    a('landing_page_view', m.lpv),
    a('omni_landing_page_view', m.lpv),
    a('view_content', m.vc),
    a('omni_view_content', m.vc),
    a('add_to_cart', m.atc),
    a('omni_add_to_cart', m.atc),
    a('initiate_checkout', m.ic),
    a('omni_initiated_checkout', m.ic),
    a('purchase', m.purchase),
    a('omni_purchase', m.purchase),
    a('offsite_conversion.fb_pixel_purchase', m.purchase),
    a('lead', m.lead),
    a('video_view', m.video),
    a('post_engagement', m.engagement),
  ].filter((x) => x.value !== '0')
  const values = [
    { action_type: 'purchase', value: m.revenue.toFixed(2) },
    { action_type: 'omni_purchase', value: m.revenue.toFixed(2) },
    { action_type: 'offsite_conversion.fb_pixel_purchase', value: m.revenue.toFixed(2) },
  ].filter((x) => x.value !== '0.00')
  return {
    date_start: since,
    date_stop: until,
    account_currency: 'USD',
    spend: m.spend.toFixed(2),
    impressions: String(Math.round(m.impressions)),
    reach: String(Math.round(m.reach)),
    clicks: String(Math.round(m.clicks)),
    inline_link_clicks: String(Math.round(m.link)),
    actions,
    action_values: values,
    video_thruplay_watched_actions: m.thruplay ? [a('video_view', m.thruplay)] : undefined,
    ...extra,
  }
}

function demoInsights(q: InsightsQuery): InsightRow[] {
  const days = eachDay(q.range)
  const groups = new Map<string, { m: M; extra: Record<string, string>; since: string; until: string; days: number }>()

  for (const c of CAMPAIGNS) {
    if (q.campaignIds?.length && !q.campaignIds.includes(c.id)) continue
    for (const as of c.adsets) {
      const adsetShare = 1 / c.adsets.length
      for (const [ai, ad] of as.ads.entries()) {
        // Uneven delivery between ads, like a real auction.
        const weights = as.ads.map((_, i) => 0.6 + rand(`${as.id}w${i}`) * 1.4)
        const adShare = (adsetShare * weights[ai]) / weights.reduce((x, y) => x + y, 0)
        for (const date of days) {
          const m = adDay(c, ad.id, adShare, date)
          if (!m.impressions) continue
          const extra: Record<string, string> = {}
          let key = 'all'
          if (q.level !== 'account') {
            extra.campaign_id = c.id
            extra.campaign_name = c.name
            key = c.id
          }
          if (q.level === 'adset' || q.level === 'ad') {
            extra.adset_id = as.id
            extra.adset_name = as.name
            key = as.id
          }
          if (q.level === 'ad') {
            extra.ad_id = ad.id
            extra.ad_name = ad.name
            key = ad.id
          }
          if (q.daily) key += '|' + date
          let g = groups.get(key)
          if (!g) {
            g = { m: zero(), extra, since: q.daily ? date : q.range.since, until: q.daily ? date : q.range.until, days: 0 }
            groups.set(key, g)
          }
          add(g.m, m)
          g.days++
        }
      }
    }
  }

  const raws: RawInsightRow[] = []
  for (const [key, g] of groups) {
    // People are reached on several days: de-duplicate reach over longer spans.
    const span = q.daily ? 1 : days.length
    g.m.reach = g.m.reach / (1 + 0.32 * Math.log(span))
    if (!q.breakdown) {
      raws.push(toRaw(g.m, g.since, g.until, g.extra))
      continue
    }
    for (const b of BUCKETS[q.breakdown]) {
      const share = b.share * jitter(key + JSON.stringify(b.v), 0.12)
      const part = zero()
      add(part, g.m, share)
      for (const k of CONVERSION_KEYS) part[k] *= b.perf
      raws.push(toRaw(part, g.since, g.until, { ...g.extra, ...b.v }))
    }
  }
  return raws.map((r) => parseRow(r, q.level, { daily: q.daily, breakdown: q.breakdown }))
}

function demoEntities(level: 'campaign' | 'adset' | 'ad'): EntityStatus[] {
  const out: EntityStatus[] = []
  for (const c of CAMPAIGNS) {
    const status = c.p.pausedDaysAgo !== undefined ? 'PAUSED' : 'ACTIVE'
    if (level === 'campaign') out.push({ id: c.id, name: c.name, status, objective: c.objective, dailyBudget: c.p.budget })
    for (const as of c.adsets) {
      if (level === 'adset') out.push({ id: as.id, name: as.name, status, dailyBudget: Math.round(c.p.budget / c.adsets.length) })
      if (level === 'ad') for (const ad of as.ads) out.push({ id: ad.id, name: ad.name, status })
    }
  }
  return out
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const DEMO_USER: MetaUser = { id: 'demo', name: 'Demo user' }

export const DEMO_ACCOUNTS: AdAccount[] = [
  { id: 'act_1000000001', accountId: '1000000001', name: 'Northwind Apparel (demo)', currency: 'USD', timezone: 'America/New_York', status: 1 },
]

export const demoApi = {
  async insights(q: InsightsQuery) {
    await wait(250 + Math.random() * 250)
    return demoInsights(q)
  },
  async entities(level: 'campaign' | 'adset' | 'ad') {
    await wait(150)
    return demoEntities(level)
  },
}
