// Per-user/IP rate limiter using Durable Object storage.
// One instance per user ID or IP — keyed when creating the stub.
export class RateLimiter implements DurableObject {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: unknown
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const action = url.searchParams.get('action') ?? 'submission'
    const cooldown = parseInt(url.searchParams.get('cooldown') ?? '30', 10)
    const windowSeconds = parseInt(url.searchParams.get('window') ?? '3600', 10)
    const maxInWindow = parseInt(url.searchParams.get('max') ?? '5', 10)

    if (url.pathname === '/check') {
      return this.check(action, cooldown, windowSeconds, maxInWindow)
    }

    if (url.pathname === '/record' && request.method === 'POST') {
      return this.record(action)
    }

    if (url.pathname === '/reset' && request.method === 'POST') {
      await this.state.storage.deleteAll()
      return new Response('ok')
    }

    return new Response('Not found', { status: 404 })
  }

  private async check(
    action: string,
    cooldownSeconds: number,
    windowSeconds: number,
    maxInWindow: number
  ): Promise<Response> {
    const now = Date.now()
    const lastKey = `last_${action}`
    const countKey = `count_${action}`
    const windowKey = `window_${action}`

    const [last, count, windowStart] = await Promise.all([
      this.state.storage.get<number>(lastKey),
      this.state.storage.get<number>(countKey),
      this.state.storage.get<number>(windowKey),
    ])

    // Cooldown check
    if (last !== undefined) {
      const elapsed = (now - last) / 1000
      if (elapsed < cooldownSeconds) {
        const retryAfter = Math.ceil(cooldownSeconds - elapsed)
        return Response.json({ allowed: false, reason: 'cooldown', retryAfter }, { status: 429 })
      }
    }

    // Sliding window rate limit
    const winStart = windowStart ?? now
    const windowElapsed = (now - winStart) / 1000
    const currentCount = windowElapsed > windowSeconds ? 0 : (count ?? 0)

    if (currentCount >= maxInWindow) {
      const retryAfter = Math.ceil(windowSeconds - windowElapsed)
      return Response.json(
        { allowed: false, reason: 'rate_limit', retryAfter },
        { status: 429 }
      )
    }

    return Response.json({ allowed: true })
  }

  private async record(action: string): Promise<Response> {
    const now = Date.now()
    const lastKey = `last_${action}`
    const countKey = `count_${action}`
    const windowKey = `window_${action}`

    const [count, windowStart] = await Promise.all([
      this.state.storage.get<number>(countKey),
      this.state.storage.get<number>(windowKey),
    ])

    const windowElapsed = windowStart !== undefined ? (now - windowStart) / 1000 : Infinity
    const newCount = windowElapsed > 3600 ? 1 : (count ?? 0) + 1
    const newWindowStart = windowElapsed > 3600 ? now : (windowStart ?? now)

    await Promise.all([
      this.state.storage.put(lastKey, now),
      this.state.storage.put(countKey, newCount),
      this.state.storage.put(windowKey, newWindowStart),
    ])

    return Response.json({ recorded: true, count: newCount })
  }
}
