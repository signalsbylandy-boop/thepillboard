import { usePresenceStore } from '@/store/presenceStore'
import { Users, Globe, Wifi, WifiOff } from 'lucide-react'

export function GlobalPresenceBadge() {
  const { online, authenticated, anonymous, wsStatus } = usePresenceStore()

  return (
    <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
      {wsStatus === 'connected' ? (
        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <span className="live-dot" />
          live
        </span>
      ) : wsStatus === 'reconnecting' ? (
        <span className="flex items-center gap-1 text-yellow-500">
          <Wifi className="w-3 h-3 animate-pulse" />
          reconnecting
        </span>
      ) : (
        <span className="flex items-center gap-1 text-zinc-400">
          <WifiOff className="w-3 h-3" />
          offline
        </span>
      )}

      <span className="flex items-center gap-1">
        <Globe className="w-3 h-3" />
        <strong className="text-zinc-700 dark:text-zinc-200">{online.toLocaleString()}</strong>
        online
      </span>

      <span className="flex items-center gap-1">
        <Users className="w-3 h-3" />
        <strong className="text-zinc-700 dark:text-zinc-200">{authenticated}</strong>
        logged in ·{' '}
        <strong className="text-zinc-700 dark:text-zinc-200">{anonymous}</strong>
        anon
      </span>
    </div>
  )
}

export function RoomViewerBadge({ postId }: { postId: string }) {
  const count = usePresenceStore((s) => s.getRoomCount(postId))
  const users = usePresenceStore((s) => s.roomUsers.get(postId) ?? [])

  if (count === 0) return null

  return (
    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
      <span className="live-dot" />
      <span>
        <strong className="text-zinc-700 dark:text-zinc-200">{count}</strong>{' '}
        {count === 1 ? 'person' : 'people'} viewing
      </span>
      {users.length > 0 && (
        <span className="hidden sm:inline">
          (
          {users
            .slice(0, 3)
            .map((u) => u.username)
            .join(', ')}
          {users.length > 3 ? ` +${users.length - 3} more` : ''})
        </span>
      )}
    </div>
  )
}

export function ActiveRoomsList() {
  const { activeRooms } = usePresenceStore()
  if (activeRooms.length === 0) return null

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Hot right now</p>
      {activeRooms.slice(0, 5).map((r) => {
        const postId = r.room.replace('post:', '')
        return (
          <div key={r.room} className="flex items-center justify-between text-xs">
            <span className="text-zinc-600 dark:text-zinc-400 truncate">{postId}</span>
            <span className="flex items-center gap-1 text-zinc-500">
              <span className="live-dot scale-75" />
              {r.count}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function AnonymousIPFeed() {
  const { recentIPs } = usePresenceStore()
  if (recentIPs.length === 0) return null

  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Recent visitors</p>
      {recentIPs.map((ip, i) => (
        <div key={i} className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
          {ip}
        </div>
      ))}
    </div>
  )
}
