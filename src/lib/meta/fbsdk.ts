/** Minimal loader for the Facebook JS SDK, used only for "Continue with Facebook". */

interface FBAuthResponse {
  accessToken: string
  expiresIn: number
  userID: string
}

interface FBStatic {
  init(opts: { appId: string; version: string; xfbml?: boolean; cookie?: boolean }): void
  login(cb: (res: { authResponse?: FBAuthResponse; status: string }) => void, opts: { scope: string; return_scopes?: boolean }): void
  logout(cb?: () => void): void
}

declare global {
  interface Window {
    FB?: FBStatic
    fbAsyncInit?: () => void
  }
}

let loading: Promise<FBStatic> | null = null
let initializedFor = ''

function load(): Promise<FBStatic> {
  if (window.FB) return Promise.resolve(window.FB)
  loading ??= new Promise<FBStatic>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://connect.facebook.net/en_US/sdk.js'
    s.async = true
    s.crossOrigin = 'anonymous'
    s.onload = () => (window.FB ? resolve(window.FB) : reject(new Error('Facebook SDK failed to initialise.')))
    s.onerror = () => {
      loading = null
      reject(new Error('Could not load the Facebook SDK. Check ad blockers or your network.'))
    }
    document.head.appendChild(s)
  })
  return loading
}

export async function facebookLogin(appId: string, version: string): Promise<string> {
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    throw new Error('Facebook Login requires the dashboard to be served over HTTPS.')
  }
  const FB = await load()
  if (initializedFor !== appId) {
    FB.init({ appId, version, cookie: false, xfbml: false })
    initializedFor = appId
  }
  return new Promise((resolve, reject) => {
    FB.login(
      (res) => {
        if (res.authResponse?.accessToken) resolve(res.authResponse.accessToken)
        else reject(new Error('Facebook Login was cancelled or not authorised.'))
      },
      { scope: 'ads_read', return_scopes: true },
    )
  })
}
