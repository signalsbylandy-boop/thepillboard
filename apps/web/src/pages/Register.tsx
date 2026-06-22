import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ApiError } from '@/lib/api'
import { useState } from 'react'

interface FormValues {
  username: string
  email: string
  password: string
  confirmPassword: string
}

export function RegisterPage() {
  const { register: registerUser, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>()

  if (isAuthenticated) {
    navigate('/', { replace: true })
    return null
  }

  const onSubmit = (data: FormValues) => {
    setApiError(null)
    registerUser.mutate(
      { username: data.username, email: data.email, password: data.password },
      {
        onSuccess: () => navigate('/'),
        onError: (err) => {
          if (err instanceof ApiError) setApiError(err.message)
          else setApiError('Something went wrong.')
        },
      }
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Create account</h1>
          <p className="text-sm text-zinc-500">Join ThePillboard community</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Username
            </label>
            <input
              {...register('username', {
                required: 'Username is required',
                minLength: { value: 3, message: 'At least 3 characters' },
                maxLength: { value: 20, message: 'Max 20 characters' },
                pattern: { value: /^[a-zA-Z0-9_-]+$/, message: 'Letters, numbers, _ and - only' },
              })}
              className="input"
              placeholder="pillboarduser"
              autoComplete="username"
            />
            {errors.username && <p className="text-xs text-red-500">{errors.username.message}</p>}
          </div>

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
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Password
            </label>
            <input
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'At least 8 characters' },
              })}
              type="password"
              className="input"
              placeholder="••••••••"
              autoComplete="new-password"
            />
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Confirm password
            </label>
            <input
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (v) => v === watch('password') || 'Passwords do not match',
              })}
              type="password"
              className="input"
              placeholder="••••••••"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>

          {apiError && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
              {apiError}
            </div>
          )}

          <button type="submit" disabled={registerUser.isPending} className="btn-primary w-full">
            {registerUser.isPending ? 'Creating account...' : 'Create account'}
          </button>

          <p className="text-xs text-zinc-400 text-center">
            By signing up you agree to our{' '}
            <Link to="/terms" className="underline hover:text-zinc-600">Terms</Link> and{' '}
            <Link to="/privacy" className="underline hover:text-zinc-600">Privacy Policy</Link>.
          </p>
        </form>

        <p className="text-center text-sm text-zinc-500">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
