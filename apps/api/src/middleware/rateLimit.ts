import type { Context, Next } from 'hono'
import type { Env, Variables } from '../types'

interface RateLimitOptions {
  action: string
  cooldown?: number
  windowSeconds?: number
  maxInWindow?: number
}

export function rateLimit(opts: RateLimitOptions) {
  return async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next): Promise<Response | void> => {
    const user = c.get('user')
    const ip =
      c.req.header('CF-Connecting-IP') ??
      c.req.header('X-Forwarded-For') ??
      'unknown'

    const key = user ? `user_${user.sub}` : `ip_${ip}`
    const id = c.env.RATE_LIMITER.idFromName(key)
    const stub = c.env.RATE_LIMITER.get(id)

    const cooldown = opts.cooldown ?? parseInt(c.env.SUBMISSION_COOLDOWN_SECONDS, 10)
    const windowSeconds = opts.windowSeconds ?? 3600
    const maxInWindow = opts.maxInWindow ?? parseInt(c.env.MAX_SUBMISSIONS_PER_HOUR, 10)

    const checkUrl = new URL('https://rate-limiter/check')
    checkUrl.searchParams.set('action', opts.action)
    checkUrl.searchParams.set('cooldown', String(cooldown))
    checkUrl.searchParams.set('window', String(windowSeconds))
    checkUrl.searchParams.set('max', String(maxInWindow))

    const res = await stub.fetch(checkUrl.toString())
    const body = (await res.json()) as { allowed: boolean; reason?: string; retryAfter?: number }

    if (!body.allowed) {
      return c.json(
        {
          error:
            body.reason === 'cooldown'
              ? `Please wait ${body.retryAfter}s before submitting again`
              : 'Rate limit exceeded',
          code: 'RATE_LIMITED',
          retryAfter: body.retryAfter,
        },
        429
      )
    }

    await next()

    // Record only on successful responses
    if (c.res.status < 400) {
      const recordUrl = new URL('https://rate-limiter/record')
      recordUrl.searchParams.set('action', opts.action)
      // Fire-and-forget — don't block the response
      void stub.fetch(recordUrl.toString(), { method: 'POST' })
    }
  }
}
