import type { WSClientMessage, WSServerMessage } from '@pillboard/types'

const WS_URL = import.meta.env.VITE_WS_URL ?? `ws://${location.host}/api`

type MessageHandler = (msg: WSServerMessage) => void
type StatusHandler = (status: 'connected' | 'disconnected' | 'reconnecting') => void

export class PillboardSocket {
  private ws: WebSocket | null = null
  private handlers = new Set<MessageHandler>()
  private statusHandlers = new Set<StatusHandler>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private reconnectDelay = 1000
  private readonly maxReconnectDelay = 30_000
  private shouldReconnect = true
  private path: string

  constructor(path: 'global' | `room/${string}`) {
    this.path = path
  }

  connect(userId?: string, username?: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) return

    const url = new URL(`${WS_URL}/presence/${this.path}/ws`)
    if (userId) url.searchParams.set('userId', userId)
    if (username) url.searchParams.set('username', username)

    this.ws = new WebSocket(url.toString())

    this.ws.onopen = () => {
      this.reconnectDelay = 1000
      this.emit('connected')
      this.startHeartbeat()
    }

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as WSServerMessage
        this.handlers.forEach((h) => h(msg))
      } catch {
        // malformed message
      }
    }

    this.ws.onclose = () => {
      this.stopHeartbeat()
      this.emit('disconnected')
      if (this.shouldReconnect) {
        this.scheduleReconnect(userId, username)
      }
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  send(msg: WSClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler)
    return () => this.statusHandlers.delete(handler)
  }

  disconnect(): void {
    this.shouldReconnect = false
    this.stopHeartbeat()
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.ws = null
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  private emit(status: 'connected' | 'disconnected' | 'reconnecting'): void {
    this.statusHandlers.forEach((h) => h(status))
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'heartbeat' })
    }, 25_000)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private scheduleReconnect(userId?: string, username?: string): void {
    this.emit('reconnecting')
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay)
      this.connect(userId, username)
    }, this.reconnectDelay)
  }
}

// Singleton sockets
let globalSocket: PillboardSocket | null = null
const roomSockets = new Map<string, PillboardSocket>()

export function getGlobalSocket(): PillboardSocket {
  if (!globalSocket) globalSocket = new PillboardSocket('global')
  return globalSocket
}

export function getRoomSocket(postId: string): PillboardSocket {
  if (!roomSockets.has(postId)) {
    roomSockets.set(postId, new PillboardSocket(`room/${postId}`))
  }
  return roomSockets.get(postId)!
}

export function destroyRoomSocket(postId: string): void {
  const s = roomSockets.get(postId)
  if (s) {
    s.disconnect()
    roomSockets.delete(postId)
  }
}
