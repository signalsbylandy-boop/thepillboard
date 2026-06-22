import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@pillboard/types'

interface AuthState {
  user: User | null
  token: string | null
  expiresAt: string | null
  setAuth: (user: User, token: string, expiresAt: string) => void
  clearAuth: () => void
  isAuthenticated: boolean
  isMod: boolean
  isAdmin: boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      expiresAt: null,
      setAuth: (user, token, expiresAt) => set({ user, token, expiresAt }),
      clearAuth: () => set({ user: null, token: null, expiresAt: null }),
      get isAuthenticated() {
        const { token, expiresAt } = get()
        if (!token || !expiresAt) return false
        return new Date(expiresAt) > new Date()
      },
      get isMod() {
        const { user } = get()
        return user?.role === 'moderator' || user?.role === 'admin'
      },
      get isAdmin() {
        return get().user?.role === 'admin'
      },
    }),
    {
      name: 'pillboard-auth',
      partialize: (s) => ({ user: s.user, token: s.token, expiresAt: s.expiresAt }),
    }
  )
)
