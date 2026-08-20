import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'

const envPath = join(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (match) process.env[match[1]] = match[2].trim()
  }
}

async function test() {
  console.log('Testing PGHOST:', process.env.PGHOST)
  console.log('Testing PGUSER:', process.env.PGUSER)
  console.log('Testing PGDATABASE:', process.env.PGDATABASE)
  console.log('Testing PGPASSWORD set?:', Boolean(process.env.PGPASSWORD))
  console.log('Testing AWS_ROLE_ARN:', process.env.AWS_ROLE_ARN)
  console.log('Testing AWS_ACCESS_KEY_ID set?:', Boolean(process.env.AWS_ACCESS_KEY_ID))

  try {
    const { Signer } = await import('@aws-sdk/rds-signer')
    const signer = new Signer({
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
      region: process.env.AWS_REGION || 'us-east-2',
      hostname: process.env.PGHOST,
      username: process.env.PGUSER || 'postgres',
      port: 5432,
    })

    let password = process.env.PGPASSWORD
    if (!password) {
      console.log('Generating RDS Signer Auth Token...')
      password = await signer.getAuthToken()
      console.log('RDS Signer Auth Token generated successfully!')
    }

    const pool = new pg.Pool({
      host: process.env.PGHOST,
      database: process.env.PGDATABASE || 'postgres',
      port: 5432,
      user: process.env.PGUSER || 'postgres',
      password,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    })

    const res = await pool.query('SELECT 1 as test')
    console.log('DB CONNECTION SUCCESSFUL! Result:', res.rows)
    await pool.end()
  } catch (err) {
    console.error('DB CONNECTION FAILED with error:', err)
  }
}

test()
