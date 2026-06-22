import { useEffect, useRef } from 'react'
import { getGlobalSocket, getRoomSocket, destroyRoomSocket } from '@/lib/websocket'
import { useAuthStore } from '@/store/authStore'
import { usePresenceStore } from '@/store/presenceStore'
import type { WSServerMessage } from '@pillboard/types'

// Connect to the global presence socket on mount — tracks site-wide visitors
export function useGlobalPresence() {
  const { user, token } = useAuthStore()
  const { setGlobalStats, pushActivity, setWsStatus } = usePresenceStore()

  useEffect(() => {
    const socket = getGlobalSocket()

    const unsubMsg = socket.onMessage((msg: WSServerMessage) => {
      if (msg.type === 'global_stats') setGlobalStats(msg)
      if (msg.type === 'activity') pushActivity(msg)
    })

    const unsubStatus = socket.onStatus(setWsStatus)

    socket.connect(user?.id, user?.username)

    if (token && user) {
      socket.send({ type: 'join_global', userId: user.id, username: user.username })
    }

    return () => {
      unsubMsg()
      unsubStatus()
    }
  }, [user?.id, token])
}

// Connect to a per-post room presence socket
export function useRoomPresence(postId: string | undefined) {
  const { user } = useAuthStore()
  const { setRoomPresence } = usePresenceStore()
  const postIdRef = useRef(postId)

  useEffect(() => {
    if (!postId) return
    postIdRef.current = postId

    const socket = getRoomSocket(postId)
    const unsubMsg = socket.onMessage((msg: WSServerMessage) => {
      if (msg.type === 'presence') {
        setRoomPresence(postId, msg.count, msg.users)
      }
    })

    socket.connect(user?.id, user?.username)
    socket.send({ type: 'join', room: `post:${postId}` })

    return () => {
      unsubMsg()
      socket.send({ type: 'leave', room: `post:${postId}` })
      destroyRoomSocket(postId)
    }
  }, [postId, user?.id])
}

// Returns the live viewer count for a post, updated via WebSocket
export function useRoomViewerCount(postId: string | undefined): number {
  useRoomPresence(postId)
  return usePresenceStore((s) => (postId ? s.getRoomCount(postId) : 0))
}
