import 'server-only'
import { Pool, type PoolClient } from 'pg'
import { Signer } from '@aws-sdk/rds-signer'
import { getAwsCredentials, getAwsRegion } from '@/lib/aws'

// ---------------------------------------------------------------------------
// Lazy pool - created only on first actual query, not at import time.
// This prevents crashes during Next.js static prerender / build where the
// Vercel OIDC context and AWS env vars are not present.
// ---------------------------------------------------------------------------
const g = globalThis as unknown as { __operantPool?: Pool }

let cachedRdsToken: string | null = null
let rdsTokenExpiresAt = 0

/**
 * Obtains an AWS RDS IAM auth token within the active Vercel request context.
 * Caches the generated RDS token conservatively for 10 minutes (AWS RDS IAM tokens expire in 15 mins).
 * The Vercel OIDC token itself is never cached.
 */
async function getValidRdsIamToken(): Promise<string> {
  const now = Date.now()
  if (cachedRdsToken && now < rdsTokenExpiresAt) {
    return cachedRdsToken
  }

  const signer = new Signer({
    credentials: getAwsCredentials(),
    region: getAwsRegion(),
    hostname: process.env.PGHOST!,
    username: process.env.PGUSER || 'postgres',
    port: Number(process.env.PGPORT ?? 5432),
  })

  const token = await signer.getAuthToken()
  cachedRdsToken = token
  rdsTokenExpiresAt = now + 10 * 60 * 1000 // 10-minute conservative safety window
  return token
}

/**
 * Obtains or updates the database pool using an explicitly resolved RDS IAM token string.
 * This guarantees pg.Pool receives a static string password and NEVER executes an async
 * OIDC callback outside request context.
 */
async function getPool(): Promise<Pool> {
  let token: string | undefined
  if (!process.env.PGPASSWORD?.trim()) {
    token = await getValidRdsIamToken()
  }

  if (g.__operantPool) {
    if (token) {
      ;(g.__operantPool.options as unknown as Record<string, unknown>).password = token
    }
    return g.__operantPool
  }

  const { attachDatabasePool } = require('@vercel/functions') as typeof import('@vercel/functions')

  const port = Number(process.env.PGPORT ?? 5432)
  const sslMode = (process.env.PGSSLMODE ?? 'verify-full').toLowerCase()
  const ssl =
    sslMode === 'disable'
      ? false
      : { rejectUnauthorized: sslMode !== 'require' && sslMode !== 'no-verify' }

  const pool = new Pool({
    host: process.env.PGHOST,
    database: process.env.PGDATABASE || 'postgres',
    port,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD?.trim() || token,
    ssl,
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 30_000,
  })

  pool.on('error', (err) => {
    console.error('[db] idle client error', err)
  })

  attachDatabasePool(pool)
  g.__operantPool = pool
  return pool
}

/** Single parameterized query. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<{ rows: T[]; rowCount: number }> {
  try {
    const pool = await getPool()
    const res = await pool.query(text, params)
    return {
      rows: res.rows as T[],
      rowCount: res.rowCount ?? 0,
    }
  } catch (err) {
    console.error('[db] Query execution failed:', err)
    throw new Error(`Database query failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

/** Multi-statement transactions. Rolls back on any thrown error. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = await getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
