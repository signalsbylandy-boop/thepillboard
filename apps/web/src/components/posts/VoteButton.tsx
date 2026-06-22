import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { votesApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

interface VoteButtonProps {
  targetId: string
  targetType: 'post' | 'comment'
  score: number
  upVotes: number
  downVotes: number
  userVote: 1 | -1 | null
  size?: 'sm' | 'md'
}

export function VoteButton({
  targetId,
  targetType,
  score,
  upVotes: _upVotes,
  downVotes: _downVotes,
  userVote: initialVote,
  size = 'md',
}: VoteButtonProps) {
  const { token, isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()

  const [localScore, setLocalScore] = useState(score)
  const [localVote, setLocalVote] = useState<1 | -1 | null>(initialVote)

  const vote = useMutation({
    mutationFn: (value: 1 | -1) => votesApi.vote({ targetId, targetType, value }, token!),
    onMutate: async (value) => {
      // Optimistic update
      const prevVote = localVote
      const delta = prevVote === value ? -value : prevVote !== null ? value * 2 : value
      setLocalScore((s) => s + delta)
      setLocalVote(prevVote === value ? null : value)
      return { prevVote }
    },
    onError: (_err, _value, ctx) => {
      setLocalScore(score)
      setLocalVote(ctx?.prevVote ?? null)
    },
    onSuccess: (data) => {
      setLocalScore(data.score)
      setLocalVote(data.userVote)
      queryClient.invalidateQueries({ queryKey: [targetType === 'post' ? 'post' : 'comments'] })
    },
  })

  const isSmall = size === 'sm'

  return (
    <div className={cn('flex flex-col items-center gap-0.5', isSmall ? 'text-xs' : 'text-sm')}>
      <button
        onClick={() => isAuthenticated && vote.mutate(1)}
        disabled={!isAuthenticated || vote.isPending}
        title={isAuthenticated ? 'Upvote' : 'Log in to vote'}
        className={cn(
          'p-0.5 rounded transition-colors',
          isAuthenticated ? 'hover:bg-orange-50 dark:hover:bg-orange-900/20' : 'cursor-not-allowed opacity-60',
          localVote === 1
            ? 'text-orange-500'
            : 'text-zinc-400 dark:text-zinc-600 hover:text-orange-500'
        )}
      >
        <ChevronUp className={isSmall ? 'w-4 h-4' : 'w-5 h-5'} />
      </button>

      <span
        className={cn(
          'font-bold tabular-nums min-w-[2ch] text-center',
          localScore > 0
            ? 'text-orange-600 dark:text-orange-400'
            : localScore < 0
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-zinc-500 dark:text-zinc-400'
        )}
      >
        {localScore}
      </span>

      <button
        onClick={() => isAuthenticated && vote.mutate(-1)}
        disabled={!isAuthenticated || vote.isPending}
        title={isAuthenticated ? 'Downvote' : 'Log in to vote'}
        className={cn(
          'p-0.5 rounded transition-colors',
          isAuthenticated ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20' : 'cursor-not-allowed opacity-60',
          localVote === -1
            ? 'text-blue-500'
            : 'text-zinc-400 dark:text-zinc-600 hover:text-blue-500'
        )}
      >
        <ChevronDown className={isSmall ? 'w-4 h-4' : 'w-5 h-5'} />
      </button>
    </div>
  )
}
