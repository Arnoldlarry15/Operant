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
  console.log('Testing Stripe API Key with live mode key...')
  console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY?.slice(0, 12) + '...')
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL)?.replace(/\/$/, '')
    console.log('Using appUrl for return_url:', `${appUrl}/?checkout_session_id={CHECKOUT_SESSION_ID}`)

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded_page',
      redirect_on_completion: 'if_required',
      return_url: `${appUrl}/?checkout_session_id={CHECKOUT_SESSION_ID}`,
      mode: 'payment',
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

    console.log('STRIPE SESSION CREATED SUCCESSFULLY!')
    console.log('Session ID:', session.id)
    console.log('Client Secret:', session.client_secret?.slice(0, 15) + '...')
  } catch (err) {
    console.error('STRIPE SESSION CREATION FAILED:', err)
  }
}

test()
