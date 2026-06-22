import { useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export function useAuth() {
  const store = useAuthStore()

  const login = useMutation({
    mutationFn: (data: { email: string; password: string }) => authApi.login(data),
    onSuccess: (res) => store.setAuth(res.user, res.token, res.expiresAt),
  })

  const register = useMutation({
    mutationFn: (data: { username: string; email: string; password: string }) =>
      authApi.register(data),
    onSuccess: (res) => store.setAuth(res.user, res.token, res.expiresAt),
  })

  const logout = useMutation({
    mutationFn: () => authApi.logout(store.token!),
    onSettled: () => store.clearAuth(),
  })

  return {
    user: store.user,
    token: store.token,
    isAuthenticated: store.isAuthenticated,
    isMod: store.isMod,
    isAdmin: store.isAdmin,
    login,
    register,
    logout,
  }
}

export function useMe() {
  const { token, isAuthenticated, setAuth } = useAuthStore()

  const query = useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.me(token!),
    enabled: isAuthenticated && !!token,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  useEffect(() => {
    if (query.data) {
      setAuth(query.data, token!, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
    }
  }, [query.data, token, setAuth])

  return query
}
