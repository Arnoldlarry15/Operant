import 'server-only'
import { query } from '@/lib/db'

const memoryStore = new Map<string, { count: number; resetAt: number }>()

export type RateLimitResult = {
  success: boolean
  remaining: number
}

/**
 * Distributed rate limiter with Aurora PostgreSQL backing for multi-instance serverless environments,
 * with an in-memory fallback when database access is unconfigured or unreachable.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const now = new Date()
    const resetAt = new Date(now.getTime() + windowSeconds * 1000)

    const { rows } = await query<{ count: number }>(
      `INSERT INTO rate_limits (key, count, reset_at)
       VALUES ($1, 1, $2)
       ON CONFLICT (key) DO UPDATE
       SET count = CASE WHEN rate_limits.reset_at < NOW() THEN 1 ELSE rate_limits.count + 1 END,
           reset_at = CASE WHEN rate_limits.reset_at < NOW() THEN EXCLUDED.reset_at ELSE rate_limits.reset_at END
       RETURNING count`,
      [key, resetAt.toISOString()],
    )

    const currentCount = Number(rows[0]?.count ?? 1)
    const success = currentCount <= limit
    const remaining = Math.max(0, limit - currentCount)
    return { success, remaining }
  } catch (err) {
    console.warn('[rate-limit] Distributed DB fallback to in-memory store:', err)

    const now = Date.now()
    const windowMs = windowSeconds * 1000
    const entry = memoryStore.get(key)

    if (!entry || now > entry.resetAt) {
      memoryStore.set(key, { count: 1, resetAt: now + windowMs })
      return { success: true, remaining: limit - 1 }
    }

    if (entry.count >= limit) {
      return { success: false, remaining: 0 }
    }

    entry.count += 1
    return { success: true, remaining: limit - entry.count }
  }
}
