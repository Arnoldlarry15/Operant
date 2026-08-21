import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import Stripe from 'stripe'

const envPath = join(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (match) process.env[match[1]] = match[2].trim()
  }
}

async function test() {
  console.log('Testing official Stripe Embedded Checkout session creation...')
  console.log('Publishable Key:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.slice(0, 15))
  console.log('Secret Key:', process.env.STRIPE_SECRET_KEY?.slice(0, 15))

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL)?.replace(/\/$/, '')
    console.log('Return URL target:', `${appUrl}/?checkout_session_id={CHECKOUT_SESSION_ID}`)

    // Stripe Embedded Checkout session
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      mode: 'payment',
      return_url: `${appUrl}/?checkout_session_id={CHECKOUT_SESSION_ID}`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: 2999,
            product_data: {
              name: 'Nexus Prime',
              description: 'Prebuilt AI Agent',
            },
          },
        },
      ],
    })

    console.log('SUCCESS! Stripe Session Created:')
    console.log('Session ID:', session.id)
    console.log('UI Mode:', session.ui_mode)
    console.log('Client Secret:', session.client_secret)
  } catch (err) {
    console.error('Stripe API error:', err)
  }
}

test()
