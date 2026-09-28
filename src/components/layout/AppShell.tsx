import { useQueryClient } from '@tanstack/react-query'
import { Check, LogOut, Moon, Pencil, Plus, RefreshCw, Settings, Sun } from 'lucide-react'
import { useState } from 'react'
import { useFilters } from '../../hooks/useData'
import { useResolvedTheme } from '../../hooks/useTheme'
import { formatRange } from '../../lib/dates'
import { useAuth } from '../../store/auth'
import { useDashboard } from '../../store/dashboard'
import { useSettings } from '../../store/settings'
import { Dashboard } from '../dashboard/Dashboard'
import { Button } from '../ui/Button'
import { MenuItem, Popover } from '../ui/Popover'
import { Switch } from '../ui/Field'
import { AccountSwitcher } from './AccountSwitcher'
import { CampaignFilter } from './CampaignFilter'
import { DashboardTabs } from './DashboardTabs'
import { DateRangePicker } from './DateRangePicker'
import { ExportMenu } from './ExportMenu'
import { Logo } from './Logo'
import { PdfProgress } from './PdfProgress'
import { SettingsDialog } from './SettingsDialog'

export function AppShell() {
  const qc = useQueryClient()
  const auth = useAuth()
  const f = useFilters()
  const theme = useResolvedTheme()
  const setSettings = useSettings((s) => s.set)
  const editing = useDashboard((s) => s.editing)
  const setEditing = useDashboard((s) => s.setEditing)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const fetching = qc.isFetching() > 0

  const disconnect = () => {
    auth.disconnect()
    setSettings({ accountId: null, campaignIds: [] })
    qc.clear()
  }

  return (
    <div className="min-h-dvh pb-[env(safe-area-inset-bottom)]">
      <header className="print-hide sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-2 px-4 sm:gap-3 sm:px-6">
          <Logo />
          <span className="hidden h-6 w-px bg-line sm:block" />
          <AccountSwitcher />
          <div className="ml-auto flex items-center gap-1">
            {auth.mode === 'demo' && (
              <span className="mr-1 hidden rounded-md bg-warn-soft px-2 py-1 text-xs font-medium text-warn sm:inline">Demo data</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              onClick={() => setSettings({ theme: theme === 'dark' ? 'light' : 'dark' })}
            >
              {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </Button>
            <Button variant="ghost" size="icon" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-[18px] w-[18px]" />
            </Button>
            <Popover
              align="end"
              className="w-60"
              trigger={({ toggle }) => (
                <button
                  type="button"
                  onClick={toggle}
                  aria-label="Account menu"
                  className="ml-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-fg"
                >
                  {(auth.user?.name ?? '?').slice(0, 1).toUpperCase()}
                </button>
              )}
            >
              {(close) => (
                <>
                  <div className="px-2.5 py-2">
                    <div className="truncate text-sm font-medium">{auth.user?.name}</div>
                    <div className="text-xs text-muted">{auth.mode === 'demo' ? 'Demo mode' : 'Connected to Meta'}</div>
                  </div>
                  <MenuItem icon={<LogOut />} onClick={() => (close(), disconnect())}>
                    {auth.mode === 'demo' ? 'Exit demo' : 'Disconnect'}
                  </MenuItem>
                </>
              )}
            </Popover>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 pt-4 pb-10 sm:px-6 sm:pt-5">
        {/* Filters scope every widget below them. */}
        <div className="print-hide mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <DateRangePicker />
            <CampaignFilter />
            <div className="flex h-10 shrink-0 items-center rounded-xl border border-line-strong bg-surface px-3 shadow-card">
              <Switch label={<span className="text-sm font-medium whitespace-nowrap">Compare</span>} checked={f.compare} onChange={(compare) => setSettings({ compare })} />
            </div>
          </div>
          <div className="flex items-center gap-2 lg:ml-auto">
            <Button onClick={() => qc.invalidateQueries()} aria-label="Refresh data" disabled={fetching}>
              <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Refresh</span>
            </Button>
            <ExportMenu />
            <div className="ml-auto flex gap-2 lg:ml-0">
              {editing && (
                <Button onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add widget</span>
                </Button>
              )}
              <Button variant={editing ? 'primary' : 'secondary'} onClick={() => setEditing(!editing)}>
                {editing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                {editing ? 'Done' : 'Customize'}
              </Button>
            </div>
          </div>
        </div>

        <div className="print-hide mb-4">
          <DashboardTabs />
        </div>

        {editing && (
          <div className="print-hide mb-4 rounded-xl border border-accent/30 bg-accent-soft px-4 py-2.5 text-sm text-fg">
            <strong className="font-semibold">Customizing.</strong> Drag widgets by their handle to rearrange, use the gear to change metrics, chart type and width, or add new widgets.
          </div>
        )}

        <div className="mb-4 hidden print:block">
          <h1 className="text-xl font-semibold">{f.account?.name}</h1>
          <p className="text-sm text-fg-2">{formatRange(f.range)}</p>
        </div>

        <Dashboard addOpen={addOpen} setAddOpen={setAddOpen} />
      </main>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <PdfProgress />
    </div>
  )
}
