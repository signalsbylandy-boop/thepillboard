import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { moderationApi } from '@/lib/api'
import { formatDistanceToNow } from '@/lib/utils'
import { CheckCircle, XCircle, Trash2, Shield, Loader2 } from 'lucide-react'

export function ModerationPage() {
  const { isMod, token } = useAuth()

  if (!isMod) return <Navigate to="/" replace />

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-orange-500" />
        <h1 className="text-xl font-bold">Moderation Queue</h1>
      </div>
      <ModerationQueue token={token!} />
    </div>
  )
}

function ModerationQueue({ token }: { token: string }) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['moderation-queue'],
    queryFn: () => moderationApi.queue(token),
    refetchInterval: 30_000,
  })

  const action = useMutation({
    mutationFn: ({ postId, act, reason }: { postId: string; act: string; reason?: string }) =>
      moderationApi.action(postId, { action: act, reason }, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moderation-queue'] }),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
      </div>
    )
  }

  const items = (data?.items ?? []) as Array<{
    queueId: string
    postId: string
    title: string
    url: string | null
    domain: string | null
    slug: string
    username: string
    postCreatedAt: string
    reason: string | null
    reportCount: number
    autoFlagged: boolean
  }>

  if (items.length === 0) {
    return (
      <div className="card p-8 text-center text-zinc-500">
        Queue is empty — you're all caught up!
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.queueId} className="card p-4 space-y-3">
          <div className="space-y-1">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</h3>
            <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
              <span>by {item.username}</span>
              <span>{formatDistanceToNow(item.postCreatedAt)}</span>
              {item.domain && <span>{item.domain}</span>}
              {item.reportCount > 0 && (
                <span className="text-red-500">{item.reportCount} reports</span>
              )}
              {item.autoFlagged && (
                <span className="text-orange-500">auto-flagged</span>
              )}
            </div>
            {item.url && (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline block truncate">
                {item.url}
              </a>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => action.mutate({ postId: item.postId, act: 'approve' })}
              disabled={action.isPending}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Approve
            </button>

            <button
              onClick={() => action.mutate({ postId: item.postId, act: 'reject', reason: 'Does not meet guidelines' })}
              disabled={action.isPending}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject
            </button>

            <button
              onClick={() => action.mutate({ postId: item.postId, act: 'remove', reason: 'Spam or rule violation' })}
              disabled={action.isPending}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>

            <Link to={`/p/${item.slug}`} target="_blank" className="ml-auto text-xs text-zinc-400 hover:text-zinc-600 self-center">
              Preview →
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}
