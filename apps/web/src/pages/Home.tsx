import { useQuery } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { postsApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { PostCard } from '@/components/posts/PostCard'
import type { SortOrder, Post } from '@pillboard/types'
import { Flame, Clock, TrendingUp, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from '@/lib/utils'

const SORT_OPTIONS: { value: SortOrder; label: string; icon: React.ReactNode }[] = [
  { value: 'hot', label: 'Hot', icon: <Flame className="w-3.5 h-3.5" /> },
  { value: 'new', label: 'New', icon: <Clock className="w-3.5 h-3.5" /> },
  { value: 'top', label: 'Top', icon: <TrendingUp className="w-3.5 h-3.5" /> },
]

function postGradient(post: Post) {
  const isHeSaid = post.tags.some(t => t.slug === 'he-said')
  const isSheSaid = post.tags.some(t => t.slug === 'she-said')
  if (isHeSaid) return 'from-blue-700 via-blue-800 to-slate-950'
  if (isSheSaid) return 'from-rose-600 via-rose-800 to-slate-950'
  return 'from-slate-600 via-slate-700 to-slate-900'
}

function FeaturedGrid({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null
  const [hero, ...rest] = posts.slice(0, 5)

  return (
    <div className="grid grid-cols-5 gap-3 py-4">
      {/* Hero — 3 cols wide, full height */}
      <Link
        to={`/p/${hero.slug}`}
        className="col-span-3 group relative rounded-xl overflow-hidden border border-slate-700 hover:border-slate-500 transition-all duration-200 animate-pop-in shadow-xl min-h-[200px]"
      >
        {hero.ogImageUrl ? (
          <>
            <img src={hero.ogImageUrl} alt="" className="w-full h-full object-cover absolute inset-0" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          </>
        ) : (
          <div className={cn('absolute inset-0 bg-gradient-to-br', postGradient(hero))}>
            <span className="absolute top-2 left-4 text-9xl font-serif text-white/5 leading-none select-none">"</span>
          </div>
        )}
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <div className="flex items-center gap-2 mb-2">
            {hero.tags[0] && (
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-orange-400 bg-black/30 px-2 py-0.5 rounded-full">
                {hero.tags[0].name}
              </span>
            )}
            <span className="text-[10px] font-mono text-white/50">{hero.score} pts</span>
          </div>
          <p className="text-base sm:text-lg font-bold text-white leading-snug line-clamp-3 group-hover:text-orange-300 transition-colors drop-shadow-md">
            {hero.title}
          </p>
          {(hero.text || hero.ogDescription) && (
            <p className="text-xs text-white/60 mt-1.5 line-clamp-2 font-normal leading-relaxed hidden sm:block">
              {hero.text?.slice(0, 100) ?? hero.ogDescription?.slice(0, 100)}
            </p>
          )}
        </div>
      </Link>

      {/* 2×2 mini grid — 2 cols */}
      <div className="col-span-2 grid grid-cols-2 gap-3">
        {rest.map((post, i) => {
          const tagLabel = post.tags[0]?.name ?? 'Pillboard'
          return (
            <Link
              key={post.id}
              to={`/p/${post.slug}`}
              className="group relative rounded-xl overflow-hidden border border-slate-700 hover:border-slate-500 transition-all duration-200 animate-pop-in min-h-[96px]"
              style={{ animationDelay: `${(i + 1) * 60}ms` }}
            >
              {post.ogImageUrl ? (
                <>
                  <img src={post.ogImageUrl} alt="" className="w-full h-full object-cover absolute inset-0" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 to-slate-950/10" />
                </>
              ) : (
                <div className={cn('absolute inset-0 bg-gradient-to-br', postGradient(post))} />
              )}
              <div className="absolute inset-0 flex flex-col justify-end p-2.5">
                <span className="text-[9px] font-mono text-orange-400/80 uppercase tracking-widest mb-1">{tagLabel}</span>
                <p className="text-xs font-semibold text-white leading-snug line-clamp-2 group-hover:text-orange-300 transition-colors drop-shadow">
                  {post.title}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function RisingStories({ posts }: { posts: Post[] }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="bg-slate-800 dark:bg-slate-900 px-4 py-2.5">
        <h2 className="text-xs font-condensed font-bold text-white uppercase tracking-widest">Rising Stories</h2>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {posts.slice(0, 8).map((post, i) => (
          <div
            key={post.id}
            className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
          >
            <span className="text-xs font-mono text-slate-300 pt-0.5 w-4 shrink-0 select-none">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <Link
                to={`/p/${post.slug}`}
                className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug hover:text-orange-600 transition-colors line-clamp-2"
              >
                {post.title}
              </Link>
              <p className="text-xs text-slate-400 mt-0.5">
                {post.score} pts · {formatDistanceToNow(post.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function HeSaidSheSaidScoreboard({ posts }: { posts: Post[] }) {
  const debated = [...posts]
    .filter((p) => p.upVotes + p.downVotes > 0)
    .sort((a, b) => (b.upVotes + b.downVotes) - (a.upVotes + a.downVotes))
    .slice(0, 5)

  if (debated.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-rose-500 px-4 py-2.5">
        <h2 className="text-xs font-condensed font-bold text-white uppercase tracking-widest">He Said · She Said</h2>
        <p className="text-xs text-white/70 mt-0.5">Most debated today</p>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {debated.map((post) => {
          const total = post.upVotes + post.downVotes
          const hePct = total > 0 ? Math.round((post.upVotes / total) * 100) : 50
          const shePct = 100 - hePct
          return (
            <div key={post.id} className="px-4 py-3">
              <Link
                to={`/p/${post.slug}`}
                className="text-xs font-medium text-slate-800 dark:text-slate-200 hover:text-orange-600 line-clamp-2 leading-snug mb-2 block transition-colors"
              >
                {post.title}
              </Link>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-blue-600 font-bold w-8 text-right">{hePct}%</span>
                <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-rose-500 transition-all"
                    style={{ width: `${hePct}%` }}
                  />
                </div>
                <span className="text-xs text-rose-500 font-bold w-8">{shePct}%</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                <span className="text-blue-500 font-medium">He Said</span>
                <span className="text-rose-500 font-medium">She Said</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TopTags() {
  const TAGS = [
    { label: 'He Said', slug: 'he-said' },
    { label: 'She Said', slug: 'she-said' },
    { label: 'Dating', slug: 'dating' },
    { label: 'Relationships', slug: 'relationships' },
    { label: 'Culture', slug: 'culture' },
    { label: 'Red Flags', slug: 'red-flags' },
    { label: 'Hot Takes', slug: 'hot-takes' },
    { label: 'Marriage', slug: 'marriage' },
    { label: 'Divorce', slug: 'divorce' },
    { label: 'Workplace', slug: 'workplace' },
  ]
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="bg-slate-800 dark:bg-slate-900 px-4 py-2.5">
        <h2 className="text-xs font-condensed font-bold text-white uppercase tracking-widest">Browse by Topic</h2>
      </div>
      <div className="p-4 flex flex-wrap gap-2">
        {TAGS.map((tag) => (
          <Link
            key={tag.slug}
            to={`/?tag=${tag.slug}`}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              tag.slug === 'he-said'
                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300'
                : tag.slug === 'she-said'
                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-300'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-orange-100 hover:text-orange-700 dark:hover:bg-orange-900/30 dark:hover:text-orange-400'
            )}
          >
            {tag.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

export function HomePage() {
  const [params, setParams] = useSearchParams()
  const sort = (params.get('sort') ?? 'hot') as SortOrder
  const tag = params.get('tag') ?? undefined
  const page = parseInt(params.get('page') ?? '1', 10)
  const { token } = useAuthStore()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['posts', sort, tag, page, token],
    queryFn: () => postsApi.list({ sort, tag, page, pageSize: 25 }, token ?? undefined),
    staleTime: 30_000,
  })

  const { data: hotData } = useQuery({
    queryKey: ['posts', 'hot', undefined, 1, token],
    queryFn: () => postsApi.list({ sort: 'hot', page: 1, pageSize: 8 }, token ?? undefined),
    staleTime: 60_000,
  })

  const { data: newData } = useQuery({
    queryKey: ['posts', 'new', undefined, 1, token],
    queryFn: () => postsApi.list({ sort: 'new', page: 1, pageSize: 8 }, token ?? undefined),
    staleTime: 60_000,
  })

  const highlights = hotData?.items.slice(0, 5) ?? []
  const rising = newData?.items ?? []
  const allPosts = data?.items ?? []

  const setSort = (s: SortOrder) => {
    const next = new URLSearchParams(params)
    next.set('sort', s)
    next.delete('page')
    setParams(next)
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const sectionLabel = tag
    ? tag.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'Top Stories'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Featured stories grid */}
      {!tag && highlights.length > 0 && (
        <div className="bg-slate-900 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between py-2.5 border-b border-slate-700/50">
              <h2 className="text-xs font-condensed font-bold text-white uppercase tracking-widest">
                Today's Highlights
              </h2>
              <span className="text-xs text-slate-500 font-mono">{today}</span>
            </div>
            <FeaturedGrid posts={highlights} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Main feed */}
          <main className="flex-1 min-w-0">
            {/* Section header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h1 className="text-sm font-condensed font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                  {sectionLabel}
                </h1>
                <span className="text-slate-300 dark:text-slate-600 select-none">|</span>
                <span className="text-xs text-slate-400">{today}</span>
                {tag && (
                  <Link
                    to="/"
                    className="text-xs text-slate-400 hover:text-orange-500 underline"
                  >
                    clear
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSort(opt.value)}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors',
                      sort === opt.value
                        ? 'bg-orange-500 text-white'
                        : 'text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800'
                    )}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Post list */}
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : isError ? (
              <div className="bg-white rounded-lg p-8 text-center border border-red-200 bg-red-50">
                <p className="text-red-600 font-semibold mb-1">Failed to load posts</p>
                <p className="text-xs text-red-400 font-mono break-all">
                  {(error as Error)?.message ?? 'Unknown error — check browser console (F12) for details'}
                </p>
                <p className="text-xs text-slate-400 mt-3">
                  API: {import.meta.env.VITE_API_URL ?? '(not set — using /api fallback)'}
                </p>
              </div>
            ) : !data?.items.length ? (
              <div className="bg-white rounded-lg p-12 text-center border border-slate-200">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-slate-500 mb-3">No posts yet in this category.</p>
                <Link to="/submit" className="text-orange-500 hover:underline font-medium">
                  Be the first to share your perspective!
                </Link>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
                {data.items.map((post, i) => (
                  <PostCard key={post.id} post={post} index={(page - 1) * 25 + i} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {data && (data.hasMore || page > 1) && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  onClick={() => {
                    const n = new URLSearchParams(params)
                    n.set('page', String(page - 1))
                    setParams(n)
                  }}
                  disabled={page <= 1}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  ← Prev
                </button>
                <span className="text-xs text-slate-400 font-mono px-2">Page {page}</span>
                <button
                  onClick={() => {
                    const n = new URLSearchParams(params)
                    n.set('page', String(page + 1))
                    setParams(n)
                  }}
                  disabled={!data.hasMore}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Next →
                </button>
              </div>
            )}
          </main>

          {/* Right sidebar */}
          <aside className="w-72 shrink-0 hidden lg:flex flex-col gap-4 animate-slide-in-left" style={{ animationDelay: '120ms' }}>
            <HeSaidSheSaidScoreboard posts={allPosts} />
            {rising.length > 0 && <RisingStories posts={rising} />}
            <TopTags />
          </aside>
        </div>
      </div>
    </div>
  )
}
