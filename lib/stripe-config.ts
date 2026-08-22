import 'server-only'

export type StripeMode = 'test' | 'live'

export type StripeConfig = {
  mode: StripeMode
  secretKey: string
  publishableKey: string
  webhookSecret: string
}

export function getStripeConfig(envOverride?: Record<string, string | undefined>): StripeConfig {
  const env = envOverride ?? process.env
  const rawMode = env.STRIPE_MODE?.trim()
  const isProduction = env.NODE_ENV === 'production'

  let mode: StripeMode
  if (!rawMode) {
    if (isProduction) {
      throw new Error('STRIPE_MODE is required in production (must be "test" or "live").')
    }
    mode = 'test'
  } else {
    const lower = rawMode.toLowerCase()
    if (lower !== 'test' && lower !== 'live') {
      throw new Error(`Invalid STRIPE_MODE "${rawMode}". Must be "test" or "live".`)
    }
    mode = lower as StripeMode
  }

  if (isProduction && mode === 'test' && env.ALLOW_STRIPE_TEST_IN_PRODUCTION !== 'true') {
    throw new Error('STRIPE_MODE="test" is blocked in production unless ALLOW_STRIPE_TEST_IN_PRODUCTION=true is explicitly set.')
  }

  if (mode === 'test') {
    const secretKey = env.STRIPE_TEST_SECRET_KEY?.trim()
    const publishableKey = env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY?.trim()
    const webhookSecret = env.STRIPE_TEST_WEBHOOK_SECRET?.trim()

    if (!secretKey) throw new Error('STRIPE_TEST_SECRET_KEY is required when STRIPE_MODE=test.')
    if (!publishableKey) throw new Error('NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY is required when STRIPE_MODE=test.')
    if (!webhookSecret) throw new Error('STRIPE_TEST_WEBHOOK_SECRET is required when STRIPE_MODE=test.')

    if (!secretKey.startsWith('sk_test_')) {
      throw new Error('STRIPE_TEST_SECRET_KEY must begin with "sk_test_".')
    }
    if (!publishableKey.startsWith('pk_test_')) {
      throw new Error('NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY must begin with "pk_test_".')
    }
    if (!webhookSecret.startsWith('whsec_')) {
      throw new Error('STRIPE_TEST_WEBHOOK_SECRET must begin with "whsec_".')
    }

    return { mode, secretKey, publishableKey, webhookSecret }
  } else {
    const secretKey = env.STRIPE_LIVE_SECRET_KEY?.trim()
    const publishableKey = env.NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY?.trim()
    const webhookSecret = env.STRIPE_LIVE_WEBHOOK_SECRET?.trim()

    if (!secretKey) throw new Error('STRIPE_LIVE_SECRET_KEY is required when STRIPE_MODE=live.')
    if (!publishableKey) throw new Error('NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY is required when STRIPE_MODE=live.')
    if (!webhookSecret) throw new Error('STRIPE_LIVE_WEBHOOK_SECRET is required when STRIPE_MODE=live.')

    if (!secretKey.startsWith('sk_live_')) {
      throw new Error('STRIPE_LIVE_SECRET_KEY must begin with "sk_live_".')
    }
    if (!publishableKey.startsWith('pk_live_')) {
      throw new Error('NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY must begin with "pk_live_".')
    }
    if (!webhookSecret.startsWith('whsec_')) {
      throw new Error('STRIPE_LIVE_WEBHOOK_SECRET must begin with "whsec_".')
    }

    return { mode, secretKey, publishableKey, webhookSecret }
  }
}

export function getStripePublishableKey(envOverride?: Record<string, string | undefined>): string {
  return getStripeConfig(envOverride).publishableKey
}

export function getStripeSecretKey(envOverride?: Record<string, string | undefined>): string {
  return getStripeConfig(envOverride).secretKey
}

export function getStripeWebhookSecret(envOverride?: Record<string, string | undefined>): string {
  return getStripeConfig(envOverride).webhookSecret
}

export function getStripeMode(envOverride?: Record<string, string | undefined>): StripeMode {
  return getStripeConfig(envOverride).mode
}
