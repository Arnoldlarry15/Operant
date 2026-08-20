const { readFileSync, existsSync } = require('node:fs')
const { join } = require('node:path')

const envPath = join(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (match) process.env[match[1]] = match[2].trim()
  }
}

console.log('PGHOST:', process.env.PGHOST)
console.log('AWS_REGION:', process.env.AWS_REGION)
console.log('AWS_ROLE_ARN:', process.env.AWS_ROLE_ARN)
console.log('AWS_ACCESS_KEY_ID set?:', Boolean(process.env.AWS_ACCESS_KEY_ID))
