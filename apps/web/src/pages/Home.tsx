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

function HighlightCard({ post }: { post: Post }) {
  return (
    <Link
      to={`/p/${post.slug}`}
      className="group flex-shrink-0 w-56 bg-white dark:bg-slate-800 rounded-lg overflow-hidden shadow-sm border border-slate-700 hover:shadow-md transition-shadow"
    >
      {post.ogImageUrl ? (
        <img src={post.ogImageUrl} alt="" className="w-full h-32 object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-32 bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
          <span className="text-3xl font-black text-slate-500">P</span>
        </div>
      )}
      <div className="p-3 space-y-1">
        {post.domain && (
          <p className="text-xs text-slate-400 uppercase tracking-wide truncate">{post.domain}</p>
        )}
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight line-clamp-2 group-hover:text-orange-400 transition-colors">
          {post.title}
        </p>
        <p className="text-xs text-orange-400 font-bold">{post.score} points</p>
      </div>
    </Link>
  )
}

function RisingStories({ posts }: { posts: Post[] }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="bg-slate-800 dark:bg-slate-900 px-4 py-2.5">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider">Rising Stories</h2>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {posts.slice(0, 8).map((post, i) => (
          <div
            key={post.id}
            className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
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

function TopTags() {
  const TAGS = [
    'AI', 'Tech', 'Science', 'Gaming', 'Culture',
    'Crypto', 'Space', 'Health', 'Climate', 'Startups',
  ]
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="bg-slate-800 dark:bg-slate-900 px-4 py-2.5">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider">Browse by Topic</h2>
      </div>
      <div className="p-4 flex flex-wrap gap-2">
        {TAGS.map((tag) => (
          <Link
            key={tag}
            to={`/?tag=${tag.toLowerCase()}`}
            className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-orange-100 hover:text-orange-700 dark:hover:bg-orange-900/30 dark:hover:text-orange-400 transition-colors"
          >
            {tag}
          </Link>
        ))}
      </div>
    </div>
  )
}

const GITHUB_STARS = [
  { name: 'microsoft/phi-4-mini', desc: 'Small but powerful reasoning model from Microsoft Research', stars: '12.4k', lang: 'Python', score: 9.2 },
  { name: 'vercel/ai', desc: 'Build AI-powered streaming text and chat UIs', stars: '8.1k', lang: 'TypeScript', score: 8.7 },
  { name: 'anthropics/claude-code', desc: 'Agentic coding tool that lives in your terminal', stars: '31.2k', lang: 'TypeScript', score: 9.8 },
  { name: 'cloudflare/workers-sdk', desc: 'The toolchain for building on Cloudflare Workers', stars: '3.2k', lang: 'TypeScript', score: 7.4 },
  { name: 'ollama/ollama', desc: 'Get up and running with large language models locally', stars: '89.3k', lang: 'Go', score: 8.9 },
]

function GitHubStars() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="bg-slate-800 dark:bg-slate-900 px-4 py-2.5 flex items-center gap-2">
        <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        <h2 className="text-xs font-bold text-white uppercase tracking-wider">GitHub Stars</h2>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {GITHUB_STARS.map((repo) => (
          <div key={repo.name} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <a
                href={`https://github.com/${repo.name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-orange-600 hover:text-orange-500 transition-colors truncate"
              >
                {repo.name}
              </a>
              <span className="shrink-0 text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                {repo.score}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{repo.desc}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-slate-400">⭐ {repo.stars}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">{repo.lang}</span>
            </div>
          </div>
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

  const { data, isLoading, isError } = useQuery({
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Highlights strip */}
      {!tag && highlights.length > 0 && (
        <div className="bg-slate-900 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between py-2.5 border-b border-slate-700">
              <h2 className="text-xs font-bold text-white uppercase tracking-widest">
                Today's Highlights
              </h2>
              <span className="text-xs text-slate-400">{today}</span>
            </div>
            <div className="flex gap-4 py-4 overflow-x-auto">
              {highlights.map((post) => (
                <HighlightCard key={post.id} post={post} />
              ))}
            </div>
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
                <h1 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  {tag ? `#${tag}` : 'Top Stories'}
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
              <div className="bg-white rounded-lg p-8 text-center text-slate-500 border border-slate-200">
                Failed to load posts. Please try again.
              </div>
            ) : !data?.items.length ? (
              <div className="bg-white rounded-lg p-8 text-center text-slate-500 border border-slate-200">
                No posts yet.{' '}
                <Link to="/submit" className="text-orange-500 hover:underline">
                  Be the first to submit!
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
              <div className="flex justify-between mt-4">
                {page > 1 ? (
                  <button
                    onClick={() => {
                      const n = new URLSearchParams(params)
                      n.set('page', String(page - 1))
                      setParams(n)
                    }}
                    className="px-4 py-2 text-sm border border-slate-200 rounded hover:bg-slate-100 text-slate-600 transition-colors"
                  >
                    ← Previous
                  </button>
                ) : (
                  <div />
                )}
                {data.hasMore && (
                  <button
                    onClick={() => {
                      const n = new URLSearchParams(params)
                      n.set('page', String(page + 1))
                      setParams(n)
                    }}
                    className="px-4 py-2 text-sm border border-slate-200 rounded hover:bg-slate-100 text-slate-600 transition-colors"
                  >
                    Next page →
                  </button>
                )}
              </div>
            )}
          </main>

          {/* Right sidebar */}
          <aside className="w-72 shrink-0 hidden lg:flex flex-col gap-4">
            {rising.length > 0 && <RisingStories posts={rising} />}
            <TopTags />
            <GitHubStars />
          </aside>
        </div>
      </div>
    </div>
  )
}
