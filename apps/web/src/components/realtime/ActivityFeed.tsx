import { usePresenceStore } from '@/store/presenceStore'
import { formatDistanceToNow } from '@/lib/utils'
import { Zap, MessageSquare, ThumbsUp, FileText } from 'lucide-react'

export function ActivityFeed() {
  const activity = usePresenceStore((s) => s.recentActivity)

  if (activity.length === 0) {
    return (
      <div className="text-xs text-zinc-400 text-center py-4">
        Waiting for activity...
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {activity.map((item, i) => (
        <ActivityItem key={`${item.timestamp}-${i}`} item={item} />
      ))}
    </div>
  )
}

function ActivityItem({
  item,
}: {
  item: { event: string; data: Record<string, unknown>; timestamp: string }
}) {
  const { event, data, timestamp } = item

  let icon = <Zap className="w-3 h-3 text-yellow-500" />
  let text = ''

  switch (event) {
    case 'new_post':
      icon = <FileText className="w-3 h-3 text-blue-500" />
      text = `${data['username'] as string} submitted "${data['title'] as string}"`
      break
    case 'new_comment':
      icon = <MessageSquare className="w-3 h-3 text-green-500" />
      text = `New comment on a post`
      break
    case 'big_vote':
      icon = <ThumbsUp className="w-3 h-3 text-orange-500" />
      text = `Post "${data['title'] as string}" is trending`
      break
    case 'user_joined':
      text = `${data['username'] as string} joined`
      break
    default:
      text = event
  }

  return (
    <div className="flex items-start gap-2 text-xs animate-fade-in">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-zinc-700 dark:text-zinc-300 truncate">{text}</p>
        <p className="text-zinc-400 dark:text-zinc-600">{formatDistanceToNow(timestamp)}</p>
      </div>
    </div>
  )
}
