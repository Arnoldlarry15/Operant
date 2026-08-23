import 'server-only'
import { Pool, type PoolClient } from 'pg'
import { Signer } from '@aws-sdk/rds-signer'
import { awsCredentialsProvider } from '@vercel/functions/oidc'

const g = globalThis as unknown as {
  __operantPool?: Pool
  __operantRdsToken?: string
  __operantRdsTokenExpiresAt?: number
}

function getCachedRdsToken(): string {
  if (!g.__operantRdsToken) {
    throw new Error('[db] RDS IAM token is not initialized.')
  }
  return g.__operantRdsToken
}

async function refreshRdsIamTokenIfNeeded(): Promise<string> {
  const now = Date.now()
  if (g.__operantRdsToken && g.__operantRdsTokenExpiresAt && now < g.__operantRdsTokenExpiresAt) {
    return g.__operantRdsToken
  }

  const roleArn = process.env.AWS_ROLE_ARN
  if (!roleArn) {
    throw new Error('[db] Database authentication failed: AWS_ROLE_ARN is missing for Vercel RDS IAM authentication.')
  }

  const port = Number(process.env.PGPORT ?? 5432)
  const region = process.env.AWS_REGION || 'us-east-2'

  const signer = new Signer({
    hostname: process.env.PGHOST!,
    port,
    username: process.env.PGUSER || 'postgres',
    region,
    credentials: awsCredentialsProvider({
      roleArn,
      clientConfig: { region },
    }),
  })

  const token = await signer.getAuthToken()
  g.__operantRdsToken = token
  g.__operantRdsTokenExpiresAt = Date.now() + 10 * 60 * 1000
  return token
}

async function getPool(): Promise<Pool> {
  const hasPgPassword = Boolean(process.env.PGPASSWORD?.trim())

  if (hasPgPassword) {
    if (!g.__operantPool) {
      const { attachDatabasePool } = require('@vercel/functions') as typeof import('@vercel/functions')
      const port = Number(process.env.PGPORT ?? 5432)
      const sslMode = (process.env.PGSSLMODE ?? 'verify-full').toLowerCase()
      const ssl = sslMode === 'disable' ? false : { rejectUnauthorized: sslMode !== 'require' && sslMode !== 'no-verify' }

      const pool = new Pool({
        host: process.env.PGHOST,
        user: process.env.PGUSER || 'postgres',
        database: process.env.PGDATABASE || 'postgres',
        password: process.env.PGPASSWORD!.trim(),
        port,
        ssl,
        max: 20,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 30_000,
      })

      pool.on('error', (err) => console.error('[db] idle client error', err))
      attachDatabasePool(pool)
      g.__operantPool = pool
    }
    return g.__operantPool
  }

  if (process.env.VERCEL) {
    await refreshRdsIamTokenIfNeeded()

    if (!g.__operantPool) {
      const { attachDatabasePool } = require('@vercel/functions') as typeof import('@vercel/functions')
      const port = Number(process.env.PGPORT ?? 5432)
      const sslMode = (process.env.PGSSLMODE ?? 'verify-full').toLowerCase()
      const ssl = sslMode === 'disable' ? false : { rejectUnauthorized: sslMode !== 'require' && sslMode !== 'no-verify' }

      const pool = new Pool({
        host: process.env.PGHOST,
        user: process.env.PGUSER || 'postgres',
        database: process.env.PGDATABASE || 'postgres',
        password: () => getCachedRdsToken(),
        port,
        ssl,
        max: 20,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 30_000,
      })

      pool.on('error', (err) => console.error('[db] idle client error', err))
      attachDatabasePool(pool)
      g.__operantPool = pool
    }
    return g.__operantPool
  }

  throw new Error(
    '[db] Database authentication failed: Neither PGPASSWORD nor Vercel environment (VERCEL=1) is present. Set PGPASSWORD in .env.local for local development.',
  )
}

/** Single parameterized query. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<{ rows: T[]; rowCount: number }> {
  try {
    const activePool = await getPool()
    const res = await activePool.query(text, params)
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
  const activePool = await getPool()
  const client = await activePool.connect()
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

