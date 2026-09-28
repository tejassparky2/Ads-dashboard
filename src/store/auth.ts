import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import type { MetaUser } from '../lib/types'

export type AuthMode = 'demo' | 'token' | 'facebook'

interface AuthState {
  mode: AuthMode | null
  token: string
  apiVersion: string
  user: MetaUser | null
  /** Keep the token in localStorage (otherwise only for this browser tab). */
  remember: boolean
  connect: (p: { mode: AuthMode; token?: string; user: MetaUser; remember?: boolean; apiVersion?: string }) => void
  disconnect: () => void
}

const KEY = 'adpulse-auth'

/**
 * Writes to localStorage when "remember me" is on, otherwise to
 * sessionStorage, and always clears the other one so a token never lingers.
 */
const tokenStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name) ?? sessionStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      const remember = (JSON.parse(value) as { state?: { remember?: boolean } }).state?.remember
      const [keep, drop] = remember ? [localStorage, sessionStorage] : [sessionStorage, localStorage]
      keep.setItem(name, value)
      drop.removeItem(name)
    } catch {
      /* storage unavailable (private mode) – stay in memory */
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name)
      sessionStorage.removeItem(name)
    } catch {
      /* ignore */
    }
  },
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      mode: null,
      token: '',
      apiVersion: '',
      user: null,
      remember: false,
      connect: ({ mode, token = '', user, remember = false, apiVersion = '' }) =>
        set({ mode, token, user, remember, apiVersion }),
      disconnect: () => set({ mode: null, token: '', user: null, remember: false }),
    }),
    {
      name: KEY,
      storage: createJSONStorage(() => tokenStorage),
      partialize: (s) => ({ mode: s.mode, token: s.token, apiVersion: s.apiVersion, user: s.user, remember: s.remember }),
    },
  ),
)
