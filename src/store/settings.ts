import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PresetId } from '../lib/dates'
import type { DateRange } from '../lib/types'

export type ThemePref = 'system' | 'light' | 'dark'

interface SettingsState {
  theme: ThemePref
  /** Canonical event id or `custom:<action_type>` */
  conversionEvent: string
  compare: boolean
  preset: PresetId
  customRange: DateRange | null
  accountId: string | null
  campaignIds: string[]
  /** Only include ads that are currently delivering. */
  activeOnly: boolean
  fbAppId: string
  set: (p: Partial<Omit<SettingsState, 'set'>>) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      conversionEvent: 'purchase',
      compare: true,
      preset: 'last_30d',
      customRange: null,
      accountId: null,
      campaignIds: [],
      activeOnly: false,
      fbAppId: '',
      set: (p) => set(p),
    }),
    { name: 'adpulse-settings', version: 1 },
  ),
)
