import { describe, expect, it } from 'vitest'
import { insightsParams } from './api'
import { parseRow, prettyDimension } from './parse'

describe('parseRow', () => {
  it('normalizes a campaign row from the Graph API', () => {
    const row = parseRow(
      {
        date_start: '2026-09-01',
        date_stop: '2026-09-27',
        campaign_id: '42',
        campaign_name: 'Prospecting',
        spend: '123.45',
        impressions: '10000',
        reach: '8000',
        clicks: '300',
        inline_link_clicks: '200',
        actions: [
          { action_type: 'link_click', value: '210' },
          { action_type: 'omni_purchase', value: '7' },
          { action_type: 'purchase', value: '7' },
        ],
        action_values: [{ action_type: 'omni_purchase', value: '350.5' }],
        video_thruplay_watched_actions: [{ action_type: 'video_view', value: '90' }],
      },
      'campaign',
    )
    expect(row.key).toBe('42')
    expect(row.name).toBe('Prospecting')
    expect(row.spend).toBe(123.45)
    expect(row.linkClicks).toBe(200)
    expect(row.actions['ev:purchase']).toBe(7)
    expect(row.actionValues['ev:purchase']).toBe(350.5)
    expect(row.actions.video_thruplay).toBe(90)
  })

  it('keys breakdown rows by their dimension value', () => {
    const row = parseRow({ date_start: 'a', date_stop: 'b', publisher_platform: 'instagram', platform_position: 'instagram_reels' }, 'account', {
      breakdown: 'platform_position',
    })
    expect(row.key).toBe('instagram:instagram_reels')
    expect(row.name).toBe('Instagram · Reels')
  })

  it('falls back to link_click actions when inline_link_clicks is missing', () => {
    const row = parseRow({ date_start: 'a', date_stop: 'b', actions: [{ action_type: 'link_click', value: '12' }] }, 'account')
    expect(row.linkClicks).toBe(12)
  })

  it('prettifies dimension values', () => {
    expect(prettyDimension('audience_network')).toBe('Audience Network')
    expect(prettyDimension('some_new_value')).toBe('Some new value')
  })
})

describe('insightsParams', () => {
  it('builds the insights request', () => {
    const p = insightsParams({
      accountId: 'act_1',
      level: 'adset',
      range: { since: '2026-09-01', until: '2026-09-07' },
      daily: true,
      breakdown: 'platform_position',
      campaignIds: ['1', '2'],
    })
    expect(p.level).toBe('adset')
    expect(p.time_increment).toBe('1')
    expect(p.breakdowns).toBe('publisher_platform,platform_position')
    expect(JSON.parse(p.time_range)).toEqual({ since: '2026-09-01', until: '2026-09-07' })
    expect(JSON.parse(p.filtering)).toEqual([{ field: 'campaign.id', operator: 'IN', value: ['1', '2'] }])
    expect(p.fields).toContain('adset_name')
    expect(p.fields).not.toContain('ad_name')
  })

  it('filters to currently active ads, combined with the campaign filter', () => {
    const range = { since: '2026-09-01', until: '2026-09-07' }
    expect(JSON.parse(insightsParams({ accountId: 'act_1', level: 'account', range, activeOnly: true }).filtering)).toEqual([
      { field: 'ad.effective_status', operator: 'IN', value: ['ACTIVE'] },
    ])
    expect(JSON.parse(insightsParams({ accountId: 'act_1', level: 'account', range, activeOnly: true, campaignIds: ['9'] }).filtering)).toEqual([
      { field: 'campaign.id', operator: 'IN', value: ['9'] },
      { field: 'ad.effective_status', operator: 'IN', value: ['ACTIVE'] },
    ])
    expect(insightsParams({ accountId: 'act_1', level: 'account', range }).filtering).toBeUndefined()
  })
})
