import { Link } from 'react-router-dom'
import { MessageSquare, ExternalLink } from 'lucide-react'
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
    <article
      className="relative flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group animate-fade-in"
      style={{ animationDelay: `${(index ?? 0) * 35}ms` }}
    >
      {/* Cover link — makes whole card clickable; interactive children sit above via z-10 */}
      <Link
        to={`/p/${post.slug}`}
        className="absolute inset-0 z-0"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Rank */}
      {index !== undefined && (
        <div className="relative z-10 w-5 text-right text-xs text-slate-300 dark:text-slate-600 font-mono shrink-0 pt-1.5 select-none">
          {index + 1}
        </div>
      )}

      {/* Vote */}
      <div className="relative z-10 shrink-0 pt-0.5">
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

      {/* Main content */}
      <div className="relative z-10 flex-1 min-w-0 space-y-1">
        <div className="flex items-start gap-2">
          <Link
            to={`/p/${post.slug}`}
            className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 hover:text-orange-600 dark:hover:text-orange-400 leading-snug transition-colors"
          >
            {post.title}
          </Link>
          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-slate-300 hover:text-orange-500 mt-1 transition-colors"
              title={post.domain ?? post.url}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-mono">
          {post.domain && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium font-sans">
              {post.domain}
            </span>
          )}
          <Link
            to={`/u/${post.author.username}`}
            className="hover:text-orange-500 transition-colors"
          >
            {post.author.username}
          </Link>
          <span>{formatDistanceToNow(post.createdAt)}</span>
          <Link
            to={`/p/${post.slug}`}
            className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <MessageSquare className="w-3 h-3" />
            {formatNumber(post.commentCount)}{' '}
            {post.commentCount === 1 ? 'comment' : 'comments'}
          </Link>
          {viewerCount > 0 && (
            <span className="flex items-center gap-1 text-green-500">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {viewerCount} viewing
            </span>
          )}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {post.tags.map((tag) => (
                <Link
                  key={tag.id}
                  to={`/?tag=${tag.slug}`}
                  className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-orange-100 hover:text-orange-600 transition-colors font-medium font-sans"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* OG Image thumbnail */}
      {post.ogImageUrl && (
        <div className="relative z-10 shrink-0 hidden sm:block ml-2">
          <img
            src={post.ogImageUrl}
            alt=""
            className="w-20 h-14 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
            loading="lazy"
          />
        </div>
      )}
    </article>
  )
}
