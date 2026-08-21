import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { streamText } from 'ai'

const envPath = join(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (match) process.env[match[1]] = match[2].trim()
  }
}

async function test() {
  console.log('Testing streamText with google/gemini-2.5-flash...')
  try {
    const result = streamText({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: 'Hello! Respond with 5 words.' }],
    })

    console.log('Stream created. Reading chunks:')
    for await (const chunk of result.textStream) {
      process.stdout.write(chunk)
    }
    console.log('\nSUCCESS!')
  } catch (err) {
    console.error('STREAM ERROR:', err)
  }
}

test()
