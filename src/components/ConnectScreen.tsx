import { BarChart3, ChevronDown, Download, KeyRound, LayoutGrid, Loader2, Lock, Smartphone, Sparkles } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { createMetaSource, demoSource } from '../lib/dataSource'
import { DEFAULT_API_VERSION, MetaApiError } from '../lib/meta/api'
import { facebookLogin } from '../lib/meta/fbsdk'
import { useAuth } from '../store/auth'
import { useSettings } from '../store/settings'
import { Logo } from './layout/Logo'
import { Button } from './ui/Button'
import { Field, Input, Segmented } from './ui/Field'

const ENV_APP_ID: string = import.meta.env.VITE_META_APP_ID || ''

const FEATURES: { icon: ReactNode; title: string; text: string }[] = [
  { icon: <BarChart3 className="h-5 w-5" />, title: 'Every metric', text: 'Spend, CPC, CPM, CTR, CPA, ROAS, AOV, funnel, video and more.' },
  { icon: <LayoutGrid className="h-5 w-5" />, title: 'Your layout', text: 'Drag, resize and configure widgets. Build multiple dashboards.' },
  { icon: <Download className="h-5 w-5" />, title: 'Export anything', text: 'Excel reports, CSV, PNG charts and print-ready PDF.' },
  { icon: <Smartphone className="h-5 w-5" />, title: 'Any screen', text: 'Built for phones, tablets and wide monitors alike.' },
]

export function ConnectScreen() {
  const connect = useAuth((s) => s.connect)
  const settings = useSettings()
  const [method, setMethod] = useState<'token' | 'facebook'>(ENV_APP_ID ? 'facebook' : 'token')
  const [token, setToken] = useState('')
  const [appId, setAppId] = useState(ENV_APP_ID || settings.fbAppId)
  const [apiVersion, setApiVersion] = useState(DEFAULT_API_VERSION)
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  const finish = async (accessToken: string, mode: 'token' | 'facebook') => {
    const source = createMetaSource(accessToken, apiVersion)
    const user = await source.me()
    const accounts = await source.accounts()
    if (!accounts.length) throw new Error('Connected, but this token cannot see any ad accounts. Make sure it has the ads_read permission and access to at least one ad account.')
    connect({ mode, token: accessToken, user, remember, apiVersion: apiVersion === DEFAULT_API_VERSION ? '' : apiVersion })
    settings.set({ accountId: accounts[0].id, campaignIds: [] })
    window.scrollTo(0, 0)
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof MetaApiError ? e.friendly : e instanceof Error ? e.message : 'Could not connect.')
    } finally {
      setBusy(false)
    }
  }

  const startDemo = async () => {
    connect({ mode: 'demo', user: await demoSource.me() })
    settings.set({ accountId: null, campaignIds: [] })
    window.scrollTo(0, 0)
  }

  return (
    <div className="min-h-dvh">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-8 sm:py-14 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
        <div>
          <Logo large />
          <h1 className="mt-8 text-3xl leading-tight font-semibold tracking-tight sm:text-[42px]">
            Your Meta Ads performance,
            <br className="hidden sm:block" /> <span className="text-accent">crystal clear.</span>
          </h1>
          <p className="mt-4 max-w-lg text-base text-fg-2 sm:text-lg">
            Connect your ad account and see CPC, CPA, ROAS and every other metric in a dashboard you design yourself.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">{f.icon}</span>
                <span>
                  <span className="block text-sm font-semibold">{f.title}</span>
                  <span className="block text-sm text-fg-2">{f.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-pop sm:p-7">
          <h2 className="text-lg font-semibold">Connect Meta Ads</h2>
          <p className="mt-1 text-sm text-fg-2">Read-only access. Your token stays in your browser and is only sent to graph.facebook.com.</p>

          <div className="mt-5">
            <Segmented
              value={method}
              onChange={(m) => {
                setMethod(m)
                setError(null)
              }}
              options={[
                { value: 'token', label: <><KeyRound className="h-4 w-4" /> Access token</> },
                { value: 'facebook', label: <><FacebookIcon /> Facebook Login</> },
              ]}
            />
          </div>

          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (method === 'token') run(() => finish(token.trim(), 'token'))
              else
                run(async () => {
                  settings.set({ fbAppId: appId.trim() })
                  await finish(await facebookLogin(appId.trim(), apiVersion), 'facebook')
                })
            }}
          >
            {method === 'token' ? (
              <Field label="Access token" hint="Needs the ads_read permission.">
                <Input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="EAAB…"
                  required
                />
              </Field>
            ) : (
              <Field label="Meta App ID" hint="Your app must have Facebook Login set up with this site's domain allowed.">
                <Input value={appId} onChange={(e) => setAppId(e.target.value)} placeholder="1234567890" inputMode="numeric" required disabled={!!ENV_APP_ID} />
              </Field>
            )}

            <details className="group text-sm">
              <summary className="flex cursor-pointer list-none items-center gap-1 text-fg-2 hover:text-fg">
                <ChevronDown className="h-4 w-4 transition group-open:rotate-180" /> Advanced
              </summary>
              <div className="mt-3">
                <Field label="Graph API version">
                  <Input value={apiVersion} onChange={(e) => setApiVersion(e.target.value)} pattern="v\d+\.\d+" />
                </Field>
              </div>
            </details>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-fg-2">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
              Keep me connected on this device
            </label>

            {error && <div className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm text-bad" role="alert">{error}</div>}

            <Button type="submit" variant="primary" className="w-full justify-center" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : method === 'token' ? <Lock className="h-4 w-4" /> : <FacebookIcon />}
              {method === 'token' ? 'Connect' : 'Continue with Facebook'}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>

          <Button className="w-full justify-center" onClick={startDemo}>
            <Sparkles className="h-4 w-4 text-accent" /> Explore with demo data
          </Button>

          <button type="button" onClick={() => setShowHelp((v) => !v)} className="mt-5 flex cursor-pointer items-center gap-1 text-sm font-medium text-accent hover:underline">
            <ChevronDown className={`h-4 w-4 transition ${showHelp ? 'rotate-180' : ''}`} /> How do I get an access token?
          </button>
          {showHelp && (
            <div className="mt-3 space-y-3 rounded-xl bg-surface-2 p-4 text-sm text-fg-2">
              <div>
                <p className="font-medium text-fg">Quick (expires in ~1–2 hours)</p>
                <ol className="mt-1 list-decimal space-y-1 pl-5">
                  <li>Open the Graph API Explorer at developers.facebook.com/tools/explorer.</li>
                  <li>Pick your app, then under Permissions add <code className="rounded bg-surface-3 px-1">ads_read</code>.</li>
                  <li>Click Generate Access Token, approve, and paste it here.</li>
                </ol>
              </div>
              <div>
                <p className="font-medium text-fg">Long-lived (recommended)</p>
                <ol className="mt-1 list-decimal space-y-1 pl-5">
                  <li>In Business Settings → Users → System users, add a system user.</li>
                  <li>Assign your ad account(s) to it with at least “View performance”.</li>
                  <li>Generate a token for your app with <code className="rounded bg-surface-3 px-1">ads_read</code> and paste it here.</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07" />
    </svg>
  )
}
