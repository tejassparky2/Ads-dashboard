import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { useState } from 'react'
import { ACCOUNT_STATUS } from '../../lib/meta/api'
import { useAccounts, useFilters } from '../../hooks/useData'
import { useSettings } from '../../store/settings'
import { Popover } from '../ui/Popover'
import { Skeleton } from '../ui/States'

export function AccountSwitcher() {
  const accounts = useAccounts()
  const { account } = useFilters()
  const set = useSettings((s) => s.set)
  const [search, setSearch] = useState('')

  if (accounts.isPending) return <Skeleton className="h-9 w-40" />
  if (!accounts.data?.length) return <span className="text-sm text-bad">No ad accounts found</span>

  const list = accounts.data.filter((a) => `${a.name} ${a.accountId}`.toLowerCase().includes(search.toLowerCase()))
  return (
    <Popover
      className="w-[320px]"
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className="flex h-10 max-w-[52vw] min-w-0 cursor-pointer items-center gap-2 rounded-xl px-2.5 text-left hover:bg-surface-3 sm:max-w-80"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm leading-tight font-semibold">{account?.name}</span>
            <span className="block truncate text-[11px] leading-tight text-muted">
              {account?.accountId} · {account?.currency}
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" />
        </button>
      )}
    >
      {(close) => (
        <div>
          {accounts.data.length > 6 && (
            <div className="relative p-1.5">
              <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ad accounts"
                className="h-9 w-full rounded-lg border border-line-strong bg-surface pr-3 pl-8 text-sm outline-none focus:border-accent"
              />
            </div>
          )}
          <ul className="max-h-80 overflow-y-auto p-1">
            {list.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    set({ accountId: a.id, campaignIds: [] })
                    close()
                  }}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-surface-3"
                >
                  <span className="w-4">{account?.id === a.id && <Check className="h-4 w-4 stroke-[2.5] text-accent" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{a.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {a.accountId} · {a.currency} · {ACCOUNT_STATUS[a.status] ?? 'Unknown'}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Popover>
  )
}
