/**
 * Meta reports the same conversion under several overlapping action types
 * (e.g. `omni_purchase`, `purchase`, `offsite_conversion.fb_pixel_purchase`).
 * Summing them would double count, so each canonical event resolves to the
 * first alias present in a row.
 */
export interface EventDef {
  id: string
  label: string
  aliases: string[]
}

export const EVENTS: EventDef[] = [
  {
    id: 'purchase',
    label: 'Purchases',
    aliases: ['omni_purchase', 'purchase', 'offsite_conversion.fb_pixel_purchase', 'onsite_web_purchase'],
  },
  {
    id: 'lead',
    label: 'Leads',
    aliases: ['lead', 'onsite_conversion.lead_grouped', 'offsite_conversion.fb_pixel_lead', 'onsite_web_lead'],
  },
  {
    id: 'complete_registration',
    label: 'Registrations',
    aliases: ['omni_complete_registration', 'complete_registration', 'offsite_conversion.fb_pixel_complete_registration'],
  },
  {
    id: 'add_to_cart',
    label: 'Adds to cart',
    aliases: ['omni_add_to_cart', 'add_to_cart', 'offsite_conversion.fb_pixel_add_to_cart', 'onsite_web_add_to_cart'],
  },
  {
    id: 'initiate_checkout',
    label: 'Checkouts initiated',
    aliases: [
      'omni_initiated_checkout',
      'initiate_checkout',
      'offsite_conversion.fb_pixel_initiate_checkout',
      'onsite_web_initiate_checkout',
    ],
  },
  {
    id: 'view_content',
    label: 'Content views',
    aliases: ['omni_view_content', 'view_content', 'offsite_conversion.fb_pixel_view_content'],
  },
  { id: 'landing_page_view', label: 'Landing page views', aliases: ['omni_landing_page_view', 'landing_page_view'] },
  { id: 'link_click', label: 'Link clicks', aliases: ['link_click'] },
  { id: 'app_install', label: 'App installs', aliases: ['omni_app_install', 'mobile_app_install', 'app_install'] },
  {
    id: 'messaging_started',
    label: 'Messaging conversations',
    aliases: ['onsite_conversion.messaging_conversation_started_7d'],
  },
  { id: 'video_view', label: '3-second video views', aliases: ['video_view'] },
  { id: 'post_engagement', label: 'Post engagements', aliases: ['post_engagement'] },
]

export const EVENT_PREFIX = 'ev:'

/** Key under which a canonical event is stored in `BaseMetrics.actions`. */
export const eventKey = (id: string) => EVENT_PREFIX + id

/** Resolve a user-chosen conversion event to its key in `BaseMetrics.actions`. */
export function conversionKey(conversionEvent: string): string {
  if (conversionEvent.startsWith('custom:')) return conversionEvent.slice('custom:'.length)
  return eventKey(conversionEvent)
}

export function eventLabel(conversionEvent: string): string {
  if (conversionEvent.startsWith('custom:')) return conversionEvent.slice('custom:'.length)
  return EVENTS.find((e) => e.id === conversionEvent)?.label ?? conversionEvent
}

/** Add canonical `ev:*` keys to a raw action map (first alias present wins). */
export function withCanonicalEvents(raw: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = { ...raw }
  for (const ev of EVENTS) {
    const alias = ev.aliases.find((a) => raw[a] !== undefined)
    if (alias) out[eventKey(ev.id)] = raw[alias]
  }
  return out
}
