import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { postsApi, commentsApi, ApiError } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { VoteButton } from '@/components/posts/VoteButton'
import { formatDistanceToNow, formatNumber } from '@/lib/utils'
import { ExternalLink, MessageSquare, ArrowLeft, Loader2, Send, ChevronUp, Share2, Link2, Check } from 'lucide-react'
import { useState } from 'react'
import type { Comment, Post } from '@pillboard/types'
import { useSeoMeta } from '@/lib/seo'

export function PostPage() {
  const { slug } = useParams<{ slug: string }>()
  const { token, isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['post', slug],
    queryFn: () => postsApi.get(slug!, token ?? undefined),
    enabled: !!slug,
    retry: 1,
  })

  const { data: comments } = useQuery({
    queryKey: ['comments', post?.id],
    queryFn: () => commentsApi.list(post!.id, token ?? undefined),
    enabled: !!post?.id,
  })

  const seoDesc = (post?.text ?? post?.ogDescription)?.slice(0, 155)
  const seoJsonLd = post
    ? JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'DiscussionForumPosting',
        headline: post.title,
        description: seoDesc ?? '',
        url: `https://thepillboard.com/p/${post.slug}`,
        datePublished: post.createdAt,
        ...(post.ogImageUrl ? { image: post.ogImageUrl } : {}),
        author: { '@type': 'Person', name: post.author.username },
        keywords: post.tags.map((t) => t.name).join(', '),
        interactionStatistic: [
          {
            '@type': 'InteractionCounter',
            interactionType: 'https://schema.org/CommentAction',
            userInteractionCount: post.commentCount,
          },
        ],
      })
    : undefined
  useSeoMeta({
    title: post?.title ?? 'ThePillboard',
    description: seoDesc ?? undefined,
    ogImage: post?.ogImageUrl ?? undefined,
    ogType: 'article',
    canonicalPath: post ? `/p/${post.slug}` : undefined,
    jsonLd: seoJsonLd,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (isError || !post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-4xl mb-4">💬</p>
        <p className="text-slate-700 dark:text-slate-300 font-semibold mb-2">Post not found</p>
        <p className="text-sm text-slate-400 mb-6">It may have been removed or the link may be wrong.</p>
        <Link to="/" className="btn-outline text-sm">← Back to feed</Link>
      </div>
    )
  }

  const topCategory = post.tags[0]?.name
  const topTag = post.tags[0]

  const postUrl = `https://thepillboard.com/p/${post.slug}`
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(postUrl)}&via=thepillboard`
  const handleCopyLink = () => {
    navigator.clipboard.writeText(postUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-0">
        {/* Back nav */}
        <div className="flex items-center gap-2 mb-5 text-xs text-slate-400">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 hover:text-orange-500 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          {topCategory && (
            <>
              <span>/</span>
              <Link
                to={`/?tag=${topCategory.toLowerCase()}`}
                className="hover:text-orange-500 transition-colors uppercase tracking-wide font-bold"
              >
                {topCategory}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-slate-300">{formatDistanceToNow(post.createdAt)}</span>
        </div>

        {/* Article hero */}
        <article className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm mb-6">
          {/* OG image */}
          {post.ogImageUrl && (
            <div className="w-full h-56 sm:h-72 overflow-hidden">
              <img
                src={post.ogImageUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6 sm:p-8">
            {/* Category + time */}
            <div className="flex items-center gap-2 mb-4">
              {topCategory && (
                <Link
                  to={`/?tag=${topCategory.toLowerCase()}`}
                  className="text-xs font-bold uppercase tracking-widest text-orange-500 hover:text-orange-600"
                >
                  {topCategory}
                </Link>
              )}
              {topCategory && <span className="text-slate-200 dark:text-slate-700">·</span>}
              <span className="text-xs text-slate-400">{formatDistanceToNow(post.createdAt)}</span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 leading-tight mb-4">
              {post.title}
            </h1>

            {/* Source link */}
            {post.url && (
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-500 font-medium mb-5 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                {post.domain ?? post.url}
              </a>
            )}

            {/* OG description or text body */}
            {(post.ogDescription || post.text) && (
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-5 mb-6">
                <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold mb-2">
                  {post.text ? 'Post' : 'Story Overview'}
                </p>
                <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {post.text ?? post.ogDescription}
                </p>
              </div>
            )}

            {/* Engagement bar */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <VoteButton
                  targetId={post.id}
                  targetType="post"
                  score={post.score}
                  upVotes={post.upVotes}
                  downVotes={post.downVotes}
                  userVote={post.userVote ?? null}
                />
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-medium">{formatNumber(post.commentCount)} comments</span>
              </div>
              <div className="flex items-center gap-1 ml-auto">
                <a
                  href={twitterShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  aria-label="Share on X / Twitter"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </a>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  aria-label="Copy link"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-orange-500" /> : <Link2 className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy link'}</span>
                </button>
                <Link
                  to={`/u/${post.author.username}`}
                  className="flex items-center gap-2 pl-2 text-sm text-slate-500 hover:text-orange-600 transition-colors border-l border-slate-100 dark:border-slate-700 ml-1"
                >
                  <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
                    {post.author.username[0]?.toUpperCase()}
                  </div>
                  <span className="hidden sm:inline">{post.author.username}</span>
                </Link>
              </div>
            </div>
          </div>
        </article>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags.map((tag) => (
              <Link
                key={tag.id}
                to={`/?tag=${tag.slug}`}
                className="px-3 py-1 rounded-full text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        )}

        {/* More in category */}
        {topTag && (
          <MoreInCategory
            categorySlug={topTag.slug}
            categoryName={topTag.name}
            currentPostId={post.id}
            token={token ?? undefined}
          />
        )}

        {/* Comments section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          {/* Comments header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              Discussion · {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
            </h2>
            {comments && comments.length > 0 && (
              <CommentSentiment comments={comments} />
            )}
          </div>

          <div className="p-6 space-y-4">
            {/* Comment form */}
            {isAuthenticated ? (
              <CommentForm
                postId={post.id}
                token={token!}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['comments', post.id] })}
              />
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 p-5 text-sm text-center text-slate-500">
                <Link to="/login" className="text-orange-500 font-medium hover:underline">Log in</Link>
                {' '}to join the discussion
              </div>
            )}

            {/* Comment list */}
            {comments && comments.length > 0 ? (
              <div className="space-y-4 mt-2">
                {comments.map((comment) => (
                  <CommentTree
                    key={comment.id}
                    comment={comment}
                    postId={post.id}
                    depth={0}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">
                No comments yet. Be the first!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MoreInCategory({
  categorySlug,
  categoryName,
  currentPostId,
  token,
}: {
  categorySlug: string
  categoryName: string
  currentPostId: string
  token?: string
}) {
  const { data } = useQuery({
    queryKey: ['posts', 'hot', categorySlug, 1, token],
    queryFn: () => postsApi.list({ sort: 'hot', tag: categorySlug, page: 1, pageSize: 8 }, token),
    staleTime: 60_000,
  })

  const related = data?.items.filter((p) => p.id !== currentPostId).slice(0, 4) ?? []

  if (related.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm mb-6">
      <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          More in {categoryName}
        </h2>
        <Link
          to={`/?tag=${categorySlug}`}
          className="text-xs text-orange-500 hover:text-orange-600 font-semibold transition-colors"
        >
          View all →
        </Link>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {related.map((p) => (
          <Link
            key={p.id}
            to={`/p/${p.slug}`}
            className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group"
          >
            {p.ogImageUrl && (
              <img
                src={p.ogImageUrl}
                alt=""
                className="w-16 h-12 object-cover rounded-lg shrink-0"
                loading="lazy"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-orange-600 transition-colors leading-snug line-clamp-2">
                {p.title}
              </p>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                {p.score} pts · {formatNumber(p.commentCount)} comments
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function CommentSentiment({ comments }: { comments: Comment[] }) {
  const scored = comments.filter((c) => c.score !== 0)
  if (scored.length === 0) return null
  const positive = scored.filter((c) => c.score > 0).length
  const pct = Math.round((positive / scored.length) * 100)
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <div className="w-20 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <div className="h-full bg-orange-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span>{pct}% positive</span>
    </div>
  )
}

function CommentForm({
  postId,
  parentId,
  token,
  onSuccess,
  onCancel,
  placeholder = 'Share your thoughts...',
}: {
  postId: string
  parentId?: string
  token: string
  onSuccess: () => void
  onCancel?: () => void
  placeholder?: string
}) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = useMutation({
    mutationFn: () => commentsApi.create({ postId, parentId, text }, token),
    onSuccess: () => {
      setText('')
      setError(null)
      onSuccess()
    },
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message)
    },
  })

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="input h-24 resize-y text-sm"
        placeholder={placeholder}
        maxLength={10000}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button onClick={onCancel} className="btn-ghost text-xs">Cancel</button>
        )}
        <button
          onClick={() => text.trim() && submit.mutate()}
          disabled={!text.trim() || submit.isPending}
          className="btn-primary text-xs gap-1 px-4 py-2"
        >
          <Send className="w-3 h-3" />
          {submit.isPending ? 'Posting...' : 'Post comment'}
        </button>
      </div>
    </div>
  )
}

function CommentTree({
  comment,
  postId,
  depth,
}: {
  comment: Comment
  postId: string
  depth: number
}) {
  const { token, isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [replying, setReplying] = useState(false)

  return (
    <div className={depth > 0 ? 'ml-6 border-l-2 border-slate-100 dark:border-slate-700 pl-4' : ''}>
      {/* Comment card */}
      <div className="group">
        {/* Author row */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
            {comment.author?.username[0]?.toUpperCase() ?? '?'}
          </div>
          {comment.author ? (
            <Link
              to={`/u/${comment.author.username}`}
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-orange-600 transition-colors"
            >
              {comment.author.username}
            </Link>
          ) : (
            <span className="text-xs text-slate-400">[deleted]</span>
          )}
          <span className="text-xs text-slate-300 dark:text-slate-600">
            {formatDistanceToNow(comment.createdAt)}
          </span>
          <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs text-slate-400">
              {comment.score > 0 ? '+' : ''}{comment.score}
            </span>
            <ChevronUp className="w-3 h-3 text-slate-300" />
          </div>
        </div>

        {/* Comment body */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg px-4 py-3 mb-2">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {comment.text}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mb-3">
          <VoteButton
            targetId={comment.id}
            targetType="comment"
            score={comment.score}
            upVotes={comment.upVotes}
            downVotes={comment.downVotes}
            userVote={comment.userVote ?? null}
            size="sm"
          />
          {isAuthenticated && depth < 6 && (
            <button
              onClick={() => setReplying((r) => !r)}
              className="text-xs text-slate-400 hover:text-orange-500 transition-colors"
            >
              {replying ? 'cancel reply' : 'reply'}
            </button>
          )}
        </div>
      </div>

      {replying && token && (
        <div className="mb-3 ml-2">
          <CommentForm
            postId={postId}
            parentId={comment.id}
            token={token}
            onSuccess={() => {
              setReplying(false)
              queryClient.invalidateQueries({ queryKey: ['comments'] })
            }}
            onCancel={() => setReplying(false)}
            placeholder="Write a reply..."
          />
        </div>
      )}

      {comment.replies?.map((reply) => (
        <CommentTree
          key={reply.id}
          comment={reply}
          postId={postId}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}
