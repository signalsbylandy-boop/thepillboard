import { useForm } from 'react-hook-form'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ApiError } from '@/lib/api'
import { useState } from 'react'

interface FormValues {
  email: string
  password: string
}

export function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from ?? '/'
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>()

  if (isAuthenticated) {
    navigate(from, { replace: true })
    return null
  }

  const onSubmit = (data: FormValues) => {
    setApiError(null)
    login.mutate(data, {
      onSuccess: () => navigate(from, { replace: true }),
      onError: (err) => {
        if (err instanceof ApiError) setApiError(err.message)
        else setApiError('Something went wrong. Please try again.')
      },
    })
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-zinc-500">Sign in to ThePillboard</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email
            </label>
            <input
              {...register('email', { required: 'Email is required' })}
              type="email"
              className="input"
              placeholder="you@example.com"
              autoComplete="email"
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-brand-600 hover:underline">
                Forgot?
              </Link>
            </div>
            <input
              {...register('password', { required: 'Password is required' })}
              type="password"
              className="input"
              placeholder="••••••••"
              autoComplete="current-password"
            />
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          </div>

          {apiError && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
              {apiError}
            </div>
          )}

          <button type="submit" disabled={login.isPending} className="btn-primary w-full">
            {login.isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500">
          New here?{' '}
          <Link to="/register" className="text-brand-600 hover:underline font-medium">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
