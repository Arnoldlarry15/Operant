import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const envPath = join(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (match) process.env[match[1]] = match[2].trim()
  }
}

function getAttribute(attributes, name) {
  return attributes?.find((attribute) => attribute.Name === name)?.Value ?? null
}

function toAppUser(attributes) {
  const id = getAttribute(attributes, 'sub')
  const email =
    getAttribute(attributes, 'email') ??
    getAttribute(attributes, 'username') ??
    getAttribute(attributes, 'preferred_username') ??
    (id ? `${id}@cognito.local` : null)
  if (!id || !email) {
    console.error('[toAppUser] Missing sub or email in attributes:', attributes)
    return null
  }

  const name =
    getAttribute(attributes, 'name') ??
    getAttribute(attributes, 'nickname') ??
    email.split('@')[0]

  return {
    id,
    email,
    name,
  }
}

console.log('Test 1 (Standard):', toAppUser([{ Name: 'sub', Value: '123' }, { Name: 'email', Value: 'test@example.com' }]))
console.log('Test 2 (Missing email attribute):', toAppUser([{ Name: 'sub', Value: '123-456' }]))
