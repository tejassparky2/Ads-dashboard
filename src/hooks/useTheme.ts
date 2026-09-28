import { useEffect, useSyncExternalStore } from 'react'
import { chartTheme, type ChartTheme } from '../lib/palette'
import { useSettings } from '../store/settings'

const mq = () => window.matchMedia('(prefers-color-scheme: dark)')

function useSystemDark() {
  return useSyncExternalStore(
    (cb) => {
      const m = mq()
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => mq().matches,
  )
}

export function useResolvedTheme(): 'light' | 'dark' {
  const pref = useSettings((s) => s.theme)
  const systemDark = useSystemDark()
  return pref === 'system' ? (systemDark ? 'dark' : 'light') : pref
}

/** Keeps `<html data-theme>` in sync with the preference. */
export function useApplyTheme() {
  const theme = useResolvedTheme()
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
}

export function useChartTheme(): ChartTheme {
  return chartTheme(useResolvedTheme())
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
  )
}
