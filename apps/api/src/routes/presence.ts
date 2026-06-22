import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import { authMiddleware } from '../middleware/auth'

const presenceRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

presenceRouter.use('*', authMiddleware)

// GET /presence/global/ws — upgrade to WebSocket, proxied to GlobalPresence DO
presenceRouter.get('/global/ws', async (c) => {
  const upgradeHeader = c.req.header('Upgrade')
  if (upgradeHeader !== 'websocket') {
    return c.json({ error: 'Expected WebSocket upgrade' }, 426)
  }

  const id = c.env.GLOBAL_PRESENCE.idFromName('global')
  const stub = c.env.GLOBAL_PRESENCE.get(id)

  const user = c.get('user')
  const url = new URL(c.req.url)
  url.pathname = '/ws'
  if (user) {
    url.searchParams.set('userId', user.sub)
    url.searchParams.set('username', user.username)
  }

  return stub.fetch(new Request(url.toString(), c.req.raw))
})

// GET /presence/room/:postId/ws — upgrade to WebSocket for per-post room
presenceRouter.get('/room/:postId/ws', async (c) => {
  const upgradeHeader = c.req.header('Upgrade')
  if (upgradeHeader !== 'websocket') {
    return c.json({ error: 'Expected WebSocket upgrade' }, 426)
  }

  const { postId } = c.req.param()
  const id = c.env.ROOM_PRESENCE.idFromName(`post:${postId}`)
  const stub = c.env.ROOM_PRESENCE.get(id)

  const user = c.get('user')
  const url = new URL(c.req.url)
  url.pathname = '/ws'
  if (user) {
    url.searchParams.set('userId', user.sub)
    url.searchParams.set('username', user.username)
  }

  return stub.fetch(new Request(url.toString(), c.req.raw))
})

// GET /presence/global/stats — JSON snapshot (for SSR / initial load)
presenceRouter.get('/global/stats', async (c) => {
  const id = c.env.GLOBAL_PRESENCE.idFromName('global')
  const stub = c.env.GLOBAL_PRESENCE.get(id)
  const res = await stub.fetch('https://global/stats')
  return res
})

// GET /presence/room/:postId/count — viewer count for a post
presenceRouter.get('/room/:postId/count', async (c) => {
  const { postId } = c.req.param()
  const id = c.env.ROOM_PRESENCE.idFromName(`post:${postId}`)
  const stub = c.env.ROOM_PRESENCE.get(id)
  const res = await stub.fetch('https://room/count')
  return res
})

export default presenceRouter
