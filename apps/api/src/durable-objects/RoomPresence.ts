import type { WSServerMessage } from '@pillboard/types'

interface RoomConnection {
  socket: WebSocket
  userId?: string
  username?: string
  ip: string
  joinedAt: string
}

// One instance per post (keyed by postId). Tracks all WebSocket connections
// viewing that post and broadcasts vote/comment updates to them in real time.
export class RoomPresence implements DurableObject {
  private connections = new Map<string, RoomConnection>()

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: unknown
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/ws') {
      return this.handleWebSocket(request)
    }

    if (url.pathname === '/count') {
      return Response.json({ count: this.connections.size })
    }

    // Internal push from API routes — broadcast a message to all room viewers
    if (url.pathname === '/push' && request.method === 'POST') {
      const msg = (await request.json()) as WSServerMessage
      this.broadcast(msg)
      return new Response('ok')
    }

    return new Response('Not found', { status: 404 })
  }

  private handleWebSocket(request: Request): Response {
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

    this.connections.set(connId, {
      socket: server,
      userId,
      username,
      ip,
      joinedAt: new Date().toISOString(),
    })

    server.serializeAttachment({ connId })

    // Send current presence state to the newly joined visitor
    server.send(JSON.stringify(this.buildPresenceMessage()))
    // Broadcast updated count to everyone
    this.broadcastPresence()

    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return
    try {
      const msg = JSON.parse(message)
      if (msg.type === 'heartbeat') {
        ws.send(JSON.stringify({ type: 'pong' }))
      }
    } catch {
      // ignore
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const { connId } = ws.deserializeAttachment() as { connId: string }
    this.connections.delete(connId)
    this.broadcastPresence()
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    const { connId } = ws.deserializeAttachment() as { connId: string }
    this.connections.delete(connId)
  }

  private buildPresenceMessage(): WSServerMessage {
    const conns = Array.from(this.connections.values())
    const authed = conns.filter((c) => !!c.userId)
    const anon = conns.filter((c) => !c.userId)
    return {
      type: 'presence',
      room: 'room',
      count: conns.length,
      anonCount: anon.length,
      users: authed.map((c) => ({ id: c.userId!, username: c.username! })),
    }
  }

  private broadcastPresence(): void {
    this.broadcast(this.buildPresenceMessage())
  }

  private broadcast(msg: WSServerMessage): void {
    const json = JSON.stringify(msg)
    for (const conn of this.connections.values()) {
      try {
        conn.socket.send(json)
      } catch {
        // closed
      }
    }
  }
}
