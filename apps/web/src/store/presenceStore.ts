import { create } from 'zustand'
import type { WSGlobalStatsMessage, WSActivityMessage } from '@pillboard/types'

interface PresenceState {
  // Global
  online: number
  authenticated: number
  anonymous: number
  recentIPs: string[]
  activeRooms: Array<{ room: string; count: number }>
  wsStatus: 'connected' | 'disconnected' | 'reconnecting'
  recentActivity: WSActivityMessage[]

  // Per-room (postId → count)
  roomCounts: Map<string, number>
  roomUsers: Map<string, Array<{ id: string; username: string }>>

  setGlobalStats: (msg: WSGlobalStatsMessage) => void
  setRoomPresence: (postId: string, count: number, users: Array<{ id: string; username: string }>) => void
  pushActivity: (msg: WSActivityMessage) => void
  setWsStatus: (status: 'connected' | 'disconnected' | 'reconnecting') => void
  getRoomCount: (postId: string) => number
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  online: 0,
  authenticated: 0,
  anonymous: 0,
  recentIPs: [],
  activeRooms: [],
  wsStatus: 'disconnected',
  recentActivity: [],
  roomCounts: new Map(),
  roomUsers: new Map(),

  setGlobalStats: (msg) =>
    set({
      online: msg.online,
      authenticated: msg.authenticated,
      anonymous: msg.anonymous,
      recentIPs: msg.recentIPs,
      activeRooms: msg.activeRooms,
    }),

  setRoomPresence: (postId, count, users) => {
    const roomCounts = new Map(get().roomCounts)
    const roomUsers = new Map(get().roomUsers)
    roomCounts.set(postId, count)
    roomUsers.set(postId, users)
    set({ roomCounts, roomUsers })
  },

  pushActivity: (msg) => {
    const recentActivity = [msg, ...get().recentActivity].slice(0, 30)
    set({ recentActivity })
  },

  setWsStatus: (wsStatus) => set({ wsStatus }),

  getRoomCount: (postId) => get().roomCounts.get(postId) ?? 0,
}))
