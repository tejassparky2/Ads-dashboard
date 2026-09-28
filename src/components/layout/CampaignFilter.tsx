import { Check, ChevronDown, Megaphone, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useEntities } from '../../hooks/useData'
import { useSettings } from '../../store/settings'
import { Button } from '../ui/Button'
import { Popover } from '../ui/Popover'

export function CampaignFilter() {
  const selected = useSettings((s) => s.campaignIds)
  const set = useSettings((s) => s.set)
  const [open, setOpen] = useState(false)
  const campaigns = useEntities('campaign', open || selected.length > 0)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState<string[]>(selected)

  const list = useMemo(() => {
    const s = search.toLowerCase()
    const rank = (st: string) => (st === 'ACTIVE' ? 0 : 1)
    return (campaigns.data ?? [])
      .filter((c) => c.name.toLowerCase().includes(s))
      .sort((a, b) => rank(a.status) - rank(b.status) || a.name.localeCompare(b.name))
  }, [campaigns.data, search])

  const label =
    selected.length === 0
      ? 'All campaigns'
      : selected.length === 1
        ? (campaigns.data?.find((c) => c.id === selected[0])?.name ?? '1 campaign')
        : `${selected.length} campaigns`

  const toggle = (id: string) => setDraft((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]))

  return (
    <Popover
      className="w-[320px]"
      trigger={({ toggle: t, open: isOpen }) => (
        <Button
          onClick={() => {
            if (!isOpen) {
              setDraft(selected)
              setSearch('')
            }
            setOpen(true)
            t()
          }}
          className={`max-w-56 ${selected.length ? '!border-accent !text-accent' : ''}`}
        >
          <Megaphone className="h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
        </Button>
      )}
    >
      {(close) => (
        <div>
          <div className="relative p-1.5">
            <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaigns"
              className="h-9 w-full rounded-lg border border-line-strong bg-surface pr-3 pl-8 text-sm outline-none focus:border-accent"
            />
          </div>
          <ul className="max-h-72 overflow-y-auto p-1">
            {campaigns.isPending && <li className="px-2.5 py-3 text-sm text-muted">Loading campaigns…</li>}
            {campaigns.data && !list.length && <li className="px-2.5 py-3 text-sm text-muted">No campaigns found.</li>}
            {list.map((c) => {
              const on = draft.includes(c.id)
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => toggle(c.id)}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-surface-3"
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? 'border-accent bg-accent text-white' : 'border-line-strong'}`}>
                      {on && <Check className="h-3 w-3 stroke-[3]" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${c.status === 'ACTIVE' ? 'bg-good' : 'bg-muted/50'}`} title={c.status} />
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="flex items-center gap-2 border-t border-line p-2">
            <Button variant="ghost" size="sm" onClick={() => setDraft([])}>
              Clear
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="ml-auto"
              onClick={() => {
                set({ campaignIds: draft })
                close()
              }}
            >
              Apply{draft.length ? ` (${draft.length})` : ''}
            </Button>
          </div>
        </div>
      )}
    </Popover>
  )
}
