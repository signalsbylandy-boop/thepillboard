import { Link } from 'react-router-dom'
import { MessageSquare, ExternalLink, Clock, Tag } from 'lucide-react'
import type { Post } from '@pillboard/types'
import { VoteButton } from './VoteButton'
import { usePresenceStore } from '@/store/presenceStore'
import { formatDistanceToNow, formatNumber } from '@/lib/utils'

interface PostCardProps {
  post: Post
  index?: number
}

export function PostCard({ post, index }: PostCardProps) {
  const viewerCount = usePresenceStore((s) => s.getRoomCount(post.id))

  return (
    <article className="card flex gap-3 p-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
      {/* Rank */}
      {index !== undefined && (
        <div className="w-6 text-right text-sm text-zinc-400 dark:text-zinc-600 font-mono shrink-0 pt-1">
          {index + 1}
        </div>
      )}

      {/* Vote */}
      <div className="shrink-0">
        <VoteButton
          targetId={post.id}
          targetType="post"
          score={post.score}
          upVotes={post.upVotes}
          downVotes={post.downVotes}
          userVote={post.userVote ?? null}
          size="sm"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start gap-2">
          <Link
            to={`/p/${post.slug}`}
            className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:text-brand-600 dark:hover:text-brand-400 leading-tight"
          >
            {post.title}
          </Link>
          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-zinc-400 hover:text-brand-500 mt-0.5"
              title={post.domain ?? post.url}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {post.domain && (
          <p className="text-xs text-zinc-400 dark:text-zinc-600">{post.domain}</p>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.tags.map((tag) => (
              <Link
                key={tag.id}
                to={`/?tag=${tag.slug}`}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-600"
              >
                <Tag className="w-2.5 h-2.5" />
                {tag.name}
              </Link>
            ))}
          </div>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 dark:text-zinc-600">
          <span>
            by{' '}
            <Link
              to={`/u/${post.author.username}`}
              className="text-zinc-600 dark:text-zinc-400 hover:text-brand-600"
            >
              {post.author.username}
            </Link>
          </span>

          <span className="flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(post.createdAt)}
          </span>

          <Link
            to={`/p/${post.slug}`}
            className="flex items-center gap-0.5 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <MessageSquare className="w-3 h-3" />
            {formatNumber(post.commentCount)}{' '}
            {post.commentCount === 1 ? 'comment' : 'comments'}
          </Link>

          {viewerCount > 0 && (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <span className="live-dot scale-75" />
              {viewerCount} viewing
            </span>
          )}
        </div>
      </div>

      {/* OG Image */}
      {post.ogImageUrl && (
        <div className="shrink-0 hidden sm:block">
          <img
            src={post.ogImageUrl}
            alt=""
            className="w-16 h-12 object-cover rounded border border-zinc-200 dark:border-zinc-800"
            loading="lazy"
          />
        </div>
      )}
    </article>
  )
}
