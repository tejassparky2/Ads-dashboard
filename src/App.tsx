import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectScreen } from './components/ConnectScreen'
import { AppShell } from './components/layout/AppShell'
import { useApplyTheme } from './hooks/useTheme'
import { MetaApiError } from './lib/meta/api'
import { useAuth } from './store/auth'

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // An expired/revoked token can't recover by retrying – send the user back to connect.
      if (error instanceof MetaApiError && error.code === 190) useAuth.getState().disconnect()
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      retry: (count, error) => !(error instanceof MetaApiError && (error.isAuth || error.code === 100)) && count < 2,
    },
  },
})

export default function App() {
  useApplyTheme()
  const mode = useAuth((s) => s.mode)
  return <QueryClientProvider client={queryClient}>{mode ? <AppShell /> : <ConnectScreen />}</QueryClientProvider>
}
