import 'server-only'
import Stripe from 'stripe'
import { getStripeSecretKey } from './stripe-config'

let stripeClient: Stripe | null = null
let currentSecretKey: string | null = null

export function getStripe(): Stripe {
  const secretKey = getStripeSecretKey()

  if (!stripeClient || currentSecretKey !== secretKey) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2026-05-27.dahlia',
    })
    currentSecretKey = secretKey
  }

  return stripeClient
}

export {
  getStripeConfig,
  getStripePublishableKey,
  getStripeSecretKey,
  getStripeWebhookSecret,
  getStripeMode,
} from './stripe-config'

