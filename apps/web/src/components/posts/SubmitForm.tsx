import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { postsApi, ApiError } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

interface FormValues {
  title: string
  url: string
  text: string
  tags: string
}

export function SubmitForm() {
  const { token } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [type, setType] = useState<'url' | 'text'>('url')
  const [apiError, setApiError] = useState<string | null>(null)
  const [retryAfter, setRetryAfter] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>()

  const submit = useMutation({
    mutationFn: (data: FormValues) => {
      const tags = data.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      return postsApi.create(
        {
          title: data.title,
          url: type === 'url' ? data.url || undefined : undefined,
          text: type === 'text' ? data.text || undefined : undefined,
          tags,
        },
        token!
      )
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      navigate(`/p/${res.slug}`, { state: { pending: true } })
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setApiError(err.message)
        if (err.status === 429) {
          setRetryAfter((err as ApiError & { retryAfter?: number }).retryAfter ?? null)
        }
      }
    },
  })

  return (
    <form onSubmit={handleSubmit((data) => submit.mutate(data))} className="space-y-5">
      {/* Type toggle */}
      <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg w-fit">
        {(['url', 'text'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              type === t
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            )}
          >
            {t === 'url' ? 'Link' : 'Text'}
          </button>
        ))}
      </div>

      {/* Title */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Title <span className="text-brand-500">*</span>
        </label>
        <input
          {...register('title', { required: 'Title is required', maxLength: { value: 200, message: 'Max 200 characters' } })}
          className="input"
          placeholder="Descriptive title for your submission..."
          maxLength={200}
        />
        {watch('title')?.length > 0 && (
          <p className="text-xs text-zinc-400">{watch('title').length}/200</p>
        )}
        {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
      </div>

      {/* URL or Text */}
      {type === 'url' ? (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            URL <span className="text-brand-500">*</span>
          </label>
          <input
            {...register('url', {
              required: 'URL is required',
              pattern: { value: /^https?:\/\/.+/, message: 'Must be a valid URL starting with http(s)://' },
            })}
            className="input font-mono text-xs"
            placeholder="https://..."
            type="url"
          />
          {errors.url && <p className="text-xs text-red-500">{errors.url.message}</p>}
        </div>
      ) : (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Text <span className="text-brand-500">*</span>
          </label>
          <textarea
            {...register('text', { required: 'Text is required', maxLength: { value: 40000, message: 'Max 40000 characters' } })}
            className="input h-48 resize-y"
            placeholder="Share your thoughts, analysis, or story..."
          />
          {errors.text && <p className="text-xs text-red-500">{errors.text.message}</p>}
        </div>
      )}

      {/* Tags */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Tags <span className="text-zinc-400 font-normal">(comma-separated, up to 5)</span>
        </label>
        <input
          {...register('tags')}
          className="input"
          placeholder="technology, science, politics..."
        />
      </div>

      {/* Error */}
      {apiError && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
          {apiError}
          {retryAfter && (
            <span className="block mt-1 font-medium">Try again in {retryAfter}s</span>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={submit.isPending}
        className="btn-primary w-full"
      >
        {submit.isPending ? 'Submitting...' : 'Submit for review'}
      </button>

      <p className="text-xs text-zinc-400 text-center">
        All submissions go through a brief review before appearing publicly.
      </p>
    </form>
  )
}
