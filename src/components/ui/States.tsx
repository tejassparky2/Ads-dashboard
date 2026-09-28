import { AlertTriangle, Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
import { MetaApiError } from '../../lib/meta/api'

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof MetaApiError ? error.friendly : error instanceof Error ? error.message : 'Something went wrong.'
  return (
    <div className="flex h-full min-h-24 flex-col items-center justify-center gap-2 p-4 text-center text-sm">
      <AlertTriangle className="h-5 w-5 text-bad" aria-hidden />
      <p className="max-w-sm text-fg-2">{msg}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="cursor-pointer text-sm font-medium text-accent hover:underline">
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex h-full min-h-24 flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted">
      {icon ?? <Inbox className="h-5 w-5" aria-hidden />}
      <div>{children}</div>
    </div>
  )
}
