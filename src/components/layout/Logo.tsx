export function Logo({ large }: { large?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <svg viewBox="0 0 32 32" className={large ? 'h-10 w-10' : 'h-8 w-8'} aria-hidden>
        <rect width="32" height="32" rx="9" fill="var(--accent)" />
        <path d="M8 22V15M13.3 22V10M18.7 22v-5M24 22V8" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className={`font-semibold tracking-tight ${large ? 'text-2xl' : 'hidden text-[17px] sm:inline'}`}>AdPulse</span>
    </div>
  )
}
