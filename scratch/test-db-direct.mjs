import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'
import { Signer } from '@aws-sdk/rds-signer'

const envPath = join(process.cwd(), '.env.local')

if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)

  for (const line of lines) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)

    if (match) {
      process.env[match[1]] = match[2].trim()
    }
  }
}

async function test() {
  const host = process.env.PGHOST
  const database = process.env.PGDATABASE || 'postgres'
  const username = process.env.PGUSER || 'postgres'
  const port = Number(process.env.PGPORT || 5432)
  const region = process.env.AWS_REGION || 'us-east-2'

  console.log('Host:', host)
  console.log('Port:', port)
  console.log('Database:', database)
  console.log('User:', username)
  console.log('Region:', region)
  console.log('PGPASSWORD set?:', Boolean(process.env.PGPASSWORD))

  try {
    const signer = new Signer({
      region,
      hostname: host,
      username,
      port,
    })

    console.log('Generating fresh RDS IAM auth token...')

    const token = await signer.getAuthToken()

    console.log('RDS IAM auth token generated successfully.')
    console.log('Attempting PostgreSQL connection...')

    const pool = new pg.Pool({
      host,
      database,
      port,
      user: username,
      password: token,
      ssl: {
        rejectUnauthorized: false,
      },
      connectionTimeoutMillis: 15000,
      query_timeout: 15000,
    })

    const result = await pool.query('SELECT 1 AS test')

    console.log('========================================')
    console.log('DB CONNECTION SUCCESSFUL')
    console.log('Result:', result.rows)
    console.log('========================================')

    await pool.end()
  } catch (err) {
    console.error('========================================')
    console.error('DB CONNECTION FAILED')
    console.error('========================================')

    if (err instanceof Error) {
      console.error('Error:', err.message)
      console.error('Name:', err.name)
      console.error('Code:', err.code ?? 'none')
      console.error('Detail:', err.detail ?? 'none')
      console.error('Hint:', err.hint ?? 'none')
    } else {
      console.error(err)
    }

    process.exitCode = 1
  }
}

test()