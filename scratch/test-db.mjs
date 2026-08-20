import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// Load .env.local
const envPath = join(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (match) process.env[match[1]] = match[2].trim()
  }
}

async function test() {
  console.log('Testing DB connection with PGHOST:', process.env.PGHOST)
  try {
    const { query } = await import('../lib/db.ts')
    const result = await query('SELECT 1 as test')
    console.log('DB SUCCESS:', result.rows)
  } catch (err) {
    console.error('DB ERROR:', err)
  }
}

test()
