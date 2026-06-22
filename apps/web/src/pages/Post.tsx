import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { postsApi, commentsApi, ApiError } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { VoteButton } from '@/components/posts/VoteButton'
import { RoomViewerBadge } from '@/components/realtime/LivePresence'
import { useRoomPresence } from '@/hooks/usePresence'
import { formatDistanceToNow } from '@/lib/utils'
import { ExternalLink, MessageSquare, ArrowLeft, Loader2, Send } from 'lucide-react'
import { useState } from 'react'
import type { Comment } from '@pillboard/types'

export function PostPage() {
  const { slug } = useParams<{ slug: string }>()
  const { token, isAuthenticated, user } = useAuthStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', slug],
    queryFn: () => postsApi.get(slug!, token ?? undefined),
    enabled: !!slug,
  })

  useRoomPresence(post?.id)

  const { data: comments } = useQuery({
    queryKey: ['comments', post?.id],
    queryFn: () => commentsApi.list(post!.id, token ?? undefined),
    enabled: !!post?.id,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-zinc-500 mb-4">Post not found.</p>
        <Link to="/" className="btn-outline text-sm">Go home</Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="btn-ghost text-sm gap-1 -ml-1">
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Post */}
      <article className="card p-5 space-y-4">
        <div className="flex gap-4">
          <VoteButton
            targetId={post.id}
            targetType="post"
            score={post.score}
            upVotes={post.upVotes}
            downVotes={post.downVotes}
            userVote={post.userVote ?? null}
          />

          <div className="flex-1 space-y-2">
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
              {post.title}
            </h1>

            {post.url && (
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-brand-600 dark:text-brand-400 hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                {post.domain ?? post.url}
              </a>
            )}

            {post.text && (
              <div className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {post.text}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
              <span>
                by{' '}
                <Link to={`/u/${post.author.username}`} className="text-zinc-600 dark:text-zinc-400 hover:underline">
                  {post.author.username}
                </Link>
              </span>
              <span>{formatDistanceToNow(post.createdAt)}</span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {post.commentCount} comments
              </span>
              <RoomViewerBadge postId={post.id} />
            </div>
          </div>
        </div>
      </article>

      {/* Comment form */}
      {isAuthenticated && <CommentForm postId={post.id} token={token!} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['comments', post.id] })} />}

      {/* Comments */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
        </h2>

        {!isAuthenticated && (
          <div className="card p-4 text-sm text-center text-zinc-500">
            <Link to="/login" className="text-brand-600 hover:underline">Log in</Link> to comment
          </div>
        )}

        {comments?.map((comment) => (
          <CommentTree key={comment.id} comment={comment} postId={post.id} depth={0} />
        ))}
      </div>
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
      onSuccess()
    },
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message)
    },
  })

  return (
    <div className="card p-4 space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="input h-24 resize-y"
        placeholder={placeholder}
        maxLength={10000}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button onClick={onCancel} className="btn-ghost text-sm">Cancel</button>
        )}
        <button
          onClick={() => text.trim() && submit.mutate()}
          disabled={!text.trim() || submit.isPending}
          className="btn-primary text-sm gap-1"
        >
          <Send className="w-3.5 h-3.5" />
          {submit.isPending ? 'Posting...' : 'Comment'}
        </button>
      </div>
    </div>
  )
}

function CommentTree({ comment, postId, depth }: { comment: Comment; postId: string; depth: number }) {
  const { token, isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [replying, setReplying] = useState(false)

  return (
    <div className={depth > 0 ? 'ml-6 border-l border-zinc-100 dark:border-zinc-800 pl-4' : ''}>
      <div className="card p-3 space-y-2">
        <div className="flex items-start gap-3">
          <VoteButton
            targetId={comment.id}
            targetType="comment"
            score={comment.score}
            upVotes={comment.upVotes}
            downVotes={comment.downVotes}
            userVote={comment.userVote ?? null}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
              {comment.author ? (
                <Link to={`/u/${comment.author.username}`} className="font-medium text-zinc-600 dark:text-zinc-400 hover:underline">
                  {comment.author.username}
                </Link>
              ) : (
                <span className="text-zinc-400">[deleted]</span>
              )}
              <span>{formatDistanceToNow(comment.createdAt)}</span>
            </div>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
              {comment.text}
            </p>
            {isAuthenticated && depth < 6 && (
              <button
                onClick={() => setReplying((r) => !r)}
                className="text-xs text-zinc-400 hover:text-zinc-600 mt-1"
              >
                {replying ? 'cancel' : 'reply'}
              </button>
            )}
          </div>
        </div>
      </div>

      {replying && token && (
        <div className="mt-2 ml-6">
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
        <CommentTree key={reply.id} comment={reply} postId={postId} depth={depth + 1} />
      ))}
    </div>
  )
}
