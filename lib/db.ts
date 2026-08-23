import 'server-only'
import { Pool, type PoolClient } from 'pg'
import { Signer } from '@aws-sdk/rds-signer'
import { awsCredentialsProvider } from '@vercel/functions/oidc'
import { attachDatabasePool } from '@vercel/functions'

const port = Number(process.env.PGPORT ?? 5432)
const region = process.env.AWS_REGION || 'us-east-2'
const sslMode = (process.env.PGSSLMODE ?? 'verify-full').toLowerCase()
const ssl =
  sslMode === 'disable'
    ? false
    : { rejectUnauthorized: sslMode !== 'require' && sslMode !== 'no-verify' }

const signer = new Signer({
  hostname: process.env.PGHOST!,
  port,
  username: process.env.PGUSER || 'postgres',
  region,
  credentials: awsCredentialsProvider({
    roleArn: process.env.AWS_ROLE_ARN!,
    clientConfig: { region },
  }),
})

const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER || 'postgres',
  database: process.env.PGDATABASE || 'postgres',
  password: () => signer.getAuthToken(),
  port,
  ssl,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 30_000,
})

pool.on('error', (err) => {
  console.error('[db] idle client error', err)
})

attachDatabasePool(pool)

/** Single parameterized query. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<{ rows: T[]; rowCount: number }> {
  try {
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
