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

async function test() {
  console.log('AI_GATEWAY_API_KEY set?:', Boolean(process.env.AI_GATEWAY_API_KEY))
  console.log('GEMINI_API_KEY set?:', Boolean(process.env.GEMINI_API_KEY))
  console.log('GROQ_API_KEY set?:', Boolean(process.env.GROQ_API_KEY))

  try {
    const { streamText } = await import('ai')
    const { resolveAgentModel } = await import('../lib/ai-runtime.ts')
    const model = resolveAgentModel('google/gemini-2.5-flash')
    console.log('Model resolved:', model)

    const result = streamText({
      model,
      messages: [{ role: 'user', content: 'Hello' }],
    })
    console.log('streamText result created!')
    for await (const chunk of result.textStream) {
      console.log('Chunk received:', chunk)
    }
    console.log('SUCCESS!')
  } catch (err) {
    console.error('CHAT TEST ERROR:', err)
  }
}

test()
