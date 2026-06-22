import type { WSClientMessage, WSServerMessage, VisitorInfo } from '@pillboard/types'

interface Connection {
  socket: WebSocket
  visitor: VisitorInfo
  rooms: Set<string>
}

export class GlobalPresence implements DurableObject {
  private connections = new Map<string, Connection>()
  private recentActivity: Array<{ event: string; data: unknown; timestamp: string }> = []
  private readonly MAX_ACTIVITY = 50

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: unknown
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/ws') {
      return this.handleWebSocket(request)
    }

    if (url.pathname === '/stats') {
      return Response.json(this.getStats())
    }

    if (url.pathname === '/broadcast' && request.method === 'POST') {
      const msg = (await request.json()) as WSServerMessage
      this.broadcast(msg)
      return new Response('ok')
    }

    return new Response('Not found', { status: 404 })
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade')
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket]

    this.state.acceptWebSocket(server)

    const connId = crypto.randomUUID()
    const ip =
      request.headers.get('CF-Connecting-IP') ??
      request.headers.get('X-Forwarded-For') ??
      'unknown'
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId') ?? undefined
    const username = url.searchParams.get('username') ?? undefined

    const visitor: VisitorInfo = {
      id: connId,
      ip: this.maskIp(ip),
      userId,
      username,
      isAuthenticated: !!userId,
      joinedAt: new Date().toISOString(),
      path: url.searchParams.get('path') ?? '/',
    }

    this.connections.set(connId, { socket: server, visitor, rooms: new Set() })

    // Tag the socket so we can look it up in webSocketMessage/webSocketClose
    server.serializeAttachment({ connId })

    this.broadcastGlobalStats()

    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const { connId } = ws.deserializeAttachment() as { connId: string }
    const conn = this.connections.get(connId)
    if (!conn) return

    try {
      const msg = JSON.parse(typeof message === 'string' ? message : '') as WSClientMessage

      if (msg.type === 'heartbeat') {
        ws.send(JSON.stringify({ type: 'pong' }))
        return
      }

      if (msg.type === 'join') {
        conn.rooms.add(msg.room)
        this.broadcastGlobalStats()
        return
      }

      if (msg.type === 'leave') {
        conn.rooms.delete(msg.room)
        this.broadcastGlobalStats()
        return
      }

      if (msg.type === 'join_global') {
        if (msg.userId && !conn.visitor.userId) {
          conn.visitor.userId = msg.userId
          conn.visitor.username = msg.username
          conn.visitor.isAuthenticated = true
          this.broadcastGlobalStats()
        }
      }
    } catch {
      // malformed message — ignore
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const { connId } = ws.deserializeAttachment() as { connId: string }
    this.connections.delete(connId)
    this.broadcastGlobalStats()
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    const { connId } = ws.deserializeAttachment() as { connId: string }
    this.connections.delete(connId)
  }

  private broadcast(msg: WSServerMessage): void {
    const json = JSON.stringify(msg)
    for (const conn of this.connections.values()) {
      try {
        conn.socket.send(json)
      } catch {
        // socket likely closed — will be cleaned up on close event
      }
    }
  }

  private broadcastGlobalStats(): void {
    const stats = this.getStats()
    const msg: WSServerMessage = {
      type: 'global_stats',
      online: stats.total,
      authenticated: stats.authenticated,
      anonymous: stats.anonymous,
      recentIPs: stats.recentIPs,
      activeRooms: stats.activeRooms,
    }
    this.broadcast(msg)
  }

  private getStats() {
    const visitors = Array.from(this.connections.values()).map((c) => c.visitor)
    const authenticated = visitors.filter((v) => v.isAuthenticated).length
    const anonymous = visitors.length - authenticated

    // Count visitors per room
    const roomCounts = new Map<string, number>()
    for (const conn of this.connections.values()) {
      for (const room of conn.rooms) {
        roomCounts.set(room, (roomCounts.get(room) ?? 0) + 1)
      }
    }

    return {
      total: visitors.length,
      authenticated,
      anonymous,
      recentIPs: visitors.slice(-10).map((v) => v.ip),
      activeRooms: Array.from(roomCounts.entries())
        .map(([room, count]) => ({ room, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
    }
  }

  pushActivity(event: string, data: unknown): void {
    this.recentActivity.unshift({ event, data, timestamp: new Date().toISOString() })
    if (this.recentActivity.length > this.MAX_ACTIVITY) {
      this.recentActivity.pop()
    }
    this.broadcast({
      type: 'activity',
      event: event as 'new_post' | 'big_vote' | 'new_comment' | 'user_joined',
      data: data as Record<string, unknown>,
      timestamp: new Date().toISOString(),
    })
  }

  private maskIp(ip: string): string {
    // Show first two octets only for privacy: 192.168.x.x
    const parts = ip.split('.')
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.x.x`
    }
    // IPv6 — show first segment only
    return ip.split(':')[0] + ':...'
  }
}
