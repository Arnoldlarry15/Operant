import 'server-only'
import Stripe from 'stripe'

const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_for_build'
export const stripe = new Stripe(stripeKey)
