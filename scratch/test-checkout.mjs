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
  console.log('Testing startCheckoutSession...')
  console.log('STRIPE_SECRET_KEY set?:', Boolean(process.env.STRIPE_SECRET_KEY))
  console.log('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY set?:', Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY))
  console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL)
  console.log('NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL)

  try {
    const { startCheckoutSession } = await import('../lib/stripe-actions.ts')
    const sampleItems = [
      {
        id: 'prebuilt-nexus',
        name: 'Nexus Prime',
        price: 29.99,
        type: 'prebuilt',
        companionMeta: {
          companion_type: 'prebuilt',
          prebuilt_id: 'nexus',
          color: '#22d3ee',
          emoji: 'AI',
        },
      },
    ]

    console.log('Calling startCheckoutSession...')
    const session = await startCheckoutSession(sampleItems)
    console.log('CHECKOUT SUCCESS! Session ID:', session.sessionId)
    console.log('Client Secret generated?:', Boolean(session.clientSecret))
  } catch (err) {
    console.error('CHECKOUT TEST FAILED with error:', err)
  }
}

test()
