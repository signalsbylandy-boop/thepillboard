import { useQuery } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { postsApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { PostCard } from '@/components/posts/PostCard'
import { ActivityFeed } from '@/components/realtime/ActivityFeed'
import { ActiveRoomsList, AnonymousIPFeed } from '@/components/realtime/LivePresence'
import type { SortOrder } from '@pillboard/types'
import { Flame, Clock, TrendingUp, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const SORT_OPTIONS: { value: SortOrder; label: string; icon: React.ReactNode }[] = [
  { value: 'hot', label: 'Hot', icon: <Flame className="w-4 h-4" /> },
  { value: 'new', label: 'New', icon: <Clock className="w-4 h-4" /> },
  { value: 'top', label: 'Top', icon: <TrendingUp className="w-4 h-4" /> },
]

export function HomePage() {
  const [params, setParams] = useSearchParams()
  const sort = (params.get('sort') ?? 'hot') as SortOrder
  const tag = params.get('tag') ?? undefined
  const page = parseInt(params.get('page') ?? '1', 10)
  const { token } = useAuthStore()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['posts', sort, tag, page, token],
    queryFn: () => postsApi.list({ sort, tag, page, pageSize: 25 }, token ?? undefined),
    staleTime: 30_000,
  })

  const setSort = (s: SortOrder) => {
    const next = new URLSearchParams(params)
    next.set('sort', s)
    next.delete('page')
    setParams(next)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex gap-6">
      {/* Main feed */}
      <main className="flex-1 min-w-0 space-y-4">
        {/* Sort bar */}
        <div className="flex items-center gap-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                sort === opt.value
                  ? 'bg-brand-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              )}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
          {tag && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-zinc-500">
                Filtered by: <strong className="text-zinc-700 dark:text-zinc-200">#{tag}</strong>
              </span>
              <Link
                to="/"
                className="text-xs text-zinc-400 hover:text-zinc-600 underline"
              >
                clear
              </Link>
            </div>
          )}
        </div>

        {/* Post list */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        ) : isError ? (
          <div className="card p-8 text-center text-zinc-500">
            Failed to load posts. Please try again.
          </div>
        ) : !data?.items.length ? (
          <div className="card p-8 text-center text-zinc-500">
            No posts yet.{' '}
            <Link to="/submit" className="text-brand-600 hover:underline">
              Be the first to submit!
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {data.items.map((post, i) => (
              <PostCard
                key={post.id}
                post={post}
                index={(page - 1) * 25 + i}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && (data.hasMore || page > 1) && (
          <div className="flex justify-between pt-2">
            {page > 1 ? (
              <button
                onClick={() => {
                  const next = new URLSearchParams(params)
                  next.set('page', String(page - 1))
                  setParams(next)
                }}
                className="btn-outline text-sm"
              >
                Previous
              </button>
            ) : (
              <div />
            )}
            {data.hasMore && (
              <button
                onClick={() => {
                  const next = new URLSearchParams(params)
                  next.set('page', String(page + 1))
                  setParams(next)
                }}
                className="btn-outline text-sm"
              >
                Next page
              </button>
            )}
          </div>
        )}
      </main>

      {/* Sidebar — real-time data */}
      <aside className="w-64 shrink-0 hidden lg:block space-y-6">
        <div className="card p-4 space-y-4">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Live Activity
          </h2>
          <ActivityFeed />
        </div>

        <div className="card p-4 space-y-4">
          <ActiveRoomsList />
        </div>

        <div className="card p-4 space-y-4">
          <AnonymousIPFeed />
        </div>
      </aside>
    </div>
  )
}
