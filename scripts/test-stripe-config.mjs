import assert from 'node:assert/strict'
import { getStripeConfig } from '../lib/stripe-config.ts'

console.log('Running Stripe Configuration Unit Tests...\n')

// 1. TEST mode happy path
{
  const config = getStripeConfig({
    STRIPE_MODE: 'test',
    STRIPE_TEST_SECRET_KEY: 'sk_test_12345',
    NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY: 'pk_test_12345',
    STRIPE_TEST_WEBHOOK_SECRET: 'whsec_12345',
  })
  assert.equal(config.mode, 'test')
  assert.equal(config.secretKey, 'sk_test_12345')
  assert.equal(config.publishableKey, 'pk_test_12345')
  assert.equal(config.webhookSecret, 'whsec_12345')
  console.log('✓ TEST mode returns correct credentials')
}

// 2. LIVE mode happy path
{
  const config = getStripeConfig({
    STRIPE_MODE: 'live',
    STRIPE_LIVE_SECRET_KEY: 'sk_live_67890',
    NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY: 'pk_live_67890',
    STRIPE_LIVE_WEBHOOK_SECRET: 'whsec_67890',
  })
  assert.equal(config.mode, 'live')
  assert.equal(config.secretKey, 'sk_live_67890')
  assert.equal(config.publishableKey, 'pk_live_67890')
  assert.equal(config.webhookSecret, 'whsec_67890')
  console.log('✓ LIVE mode returns correct credentials')
}

// 3. Invalid STRIPE_MODE -> fails
{
  assert.throws(
    () =>
      getStripeConfig({
        STRIPE_MODE: 'invalid_mode',
      }),
    /Invalid STRIPE_MODE/
  )
  console.log('✓ Invalid STRIPE_MODE throws error')
}

// 4. Test mode with sk_live key -> fails
{
  assert.throws(
    () =>
      getStripeConfig({
        STRIPE_MODE: 'test',
        STRIPE_TEST_SECRET_KEY: 'sk_live_wrong',
        NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY: 'pk_test_12345',
        STRIPE_TEST_WEBHOOK_SECRET: 'whsec_12345',
      }),
    /STRIPE_TEST_SECRET_KEY must begin with "sk_test_"/
  )
  console.log('✓ Test mode with sk_live key throws error')
}

// 5. Live mode with sk_test key -> fails
{
  assert.throws(
    () =>
      getStripeConfig({
        STRIPE_MODE: 'live',
        STRIPE_LIVE_SECRET_KEY: 'sk_test_wrong',
        NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY: 'pk_live_67890',
        STRIPE_LIVE_WEBHOOK_SECRET: 'whsec_67890',
      }),
    /STRIPE_LIVE_SECRET_KEY must begin with "sk_live_"/
  )
  console.log('✓ Live mode with sk_test key throws error')
}

// 6. Missing required key -> fails
{
  assert.throws(
    () =>
      getStripeConfig({
        STRIPE_MODE: 'test',
        STRIPE_TEST_SECRET_KEY: 'sk_test_12345',
        NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY: 'pk_test_12345',
        // missing STRIPE_TEST_WEBHOOK_SECRET
      }),
    /STRIPE_TEST_WEBHOOK_SECRET is required/
  )
  console.log('✓ Missing required key throws error')
}

// 7. Production + test mode without explicit opt-in -> fails
{
  assert.throws(
    () =>
      getStripeConfig({
        NODE_ENV: 'production',
        STRIPE_MODE: 'test',
        STRIPE_TEST_SECRET_KEY: 'sk_test_12345',
        NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY: 'pk_test_12345',
        STRIPE_TEST_WEBHOOK_SECRET: 'whsec_12345',
      }),
    /STRIPE_MODE="test" is blocked in production/
  )
  console.log('✓ Production + TEST mode without opt-in throws error')
}

// 8. Production + test mode with ALLOW_STRIPE_TEST_IN_PRODUCTION=true -> succeeds
{
  const config = getStripeConfig({
    NODE_ENV: 'production',
    STRIPE_MODE: 'test',
    ALLOW_STRIPE_TEST_IN_PRODUCTION: 'true',
    STRIPE_TEST_SECRET_KEY: 'sk_test_12345',
    NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY: 'pk_test_12345',
    STRIPE_TEST_WEBHOOK_SECRET: 'whsec_12345',
  })
  assert.equal(config.mode, 'test')
  console.log('✓ Production + TEST mode with ALLOW_STRIPE_TEST_IN_PRODUCTION=true succeeds')
}

// 9. Production + missing STRIPE_MODE -> fails
{
  assert.throws(
    () =>
      getStripeConfig({
        NODE_ENV: 'production',
      }),
    /STRIPE_MODE is required in production/
  )
  console.log('✓ Production without STRIPE_MODE throws error')
}

// 10. Vercel Preview (VERCEL_ENV=preview, NODE_ENV=production) + TEST mode -> succeeds
{
  const config = getStripeConfig({
    VERCEL_ENV: 'preview',
    NODE_ENV: 'production',
    STRIPE_MODE: 'test',
    STRIPE_TEST_SECRET_KEY: 'sk_test_preview_123',
    NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY: 'pk_test_preview_123',
    STRIPE_TEST_WEBHOOK_SECRET: 'whsec_preview_123',
  })
  assert.equal(config.mode, 'test')
  assert.equal(config.secretKey, 'sk_test_preview_123')
  assert.equal(config.publishableKey, 'pk_test_preview_123')
  assert.equal(config.webhookSecret, 'whsec_preview_123')
  console.log('✓ Vercel Preview (VERCEL_ENV=preview) permits TEST mode despite NODE_ENV=production')
}

// 11. Vercel Preview + TEST mode with mismatched sk_live key -> fails
{
  assert.throws(
    () =>
      getStripeConfig({
        VERCEL_ENV: 'preview',
        NODE_ENV: 'production',
        STRIPE_MODE: 'test',
        STRIPE_TEST_SECRET_KEY: 'sk_live_mismatched',
        NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY: 'pk_test_preview_123',
        STRIPE_TEST_WEBHOOK_SECRET: 'whsec_preview_123',
      }),
    /STRIPE_TEST_SECRET_KEY must begin with "sk_test_"/
  )
  console.log('✓ Vercel Preview with mismatched sk_live key throws error')
}

// 12. Vercel Preview + TEST mode with mismatched pk_live key -> fails
{
  assert.throws(
    () =>
      getStripeConfig({
        VERCEL_ENV: 'preview',
        NODE_ENV: 'production',
        STRIPE_MODE: 'test',
        STRIPE_TEST_SECRET_KEY: 'sk_test_preview_123',
        NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY: 'pk_live_mismatched',
        STRIPE_TEST_WEBHOOK_SECRET: 'whsec_preview_123',
      }),
    /NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY must begin with "pk_test_"/
  )
  console.log('✓ Vercel Preview with mismatched pk_live key throws error')
}

// 13. Vercel Preview + TEST mode with invalid webhook secret format -> fails
{
  assert.throws(
    () =>
      getStripeConfig({
        VERCEL_ENV: 'preview',
        NODE_ENV: 'production',
        STRIPE_MODE: 'test',
        STRIPE_TEST_SECRET_KEY: 'sk_test_preview_123',
        NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY: 'pk_test_preview_123',
        STRIPE_TEST_WEBHOOK_SECRET: 'invalid_secret_prefix',
      }),
    /STRIPE_TEST_WEBHOOK_SECRET must begin with "whsec_"/
  )
  console.log('✓ Vercel Preview with invalid webhook secret format throws error')
}

// 14. Vercel Production (VERCEL_ENV=production) + TEST mode without opt-in -> strictly blocked
{
  assert.throws(
    () =>
      getStripeConfig({
        VERCEL_ENV: 'production',
        NODE_ENV: 'production',
        STRIPE_MODE: 'test',
        STRIPE_TEST_SECRET_KEY: 'sk_test_prod_123',
        NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY: 'pk_test_prod_123',
        STRIPE_TEST_WEBHOOK_SECRET: 'whsec_prod_123',
      }),
    /STRIPE_MODE="test" is blocked in production/
  )
  console.log('✓ Vercel Production (VERCEL_ENV=production) strictly blocks TEST mode')
}

// 15. Vercel Production (VERCEL_ENV=production) + LIVE mode happy path -> succeeds
{
  const config = getStripeConfig({
    VERCEL_ENV: 'production',
    NODE_ENV: 'production',
    STRIPE_MODE: 'live',
    STRIPE_LIVE_SECRET_KEY: 'sk_live_prod_456',
    NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY: 'pk_live_prod_456',
    STRIPE_LIVE_WEBHOOK_SECRET: 'whsec_prod_456',
  })
  assert.equal(config.mode, 'live')
  assert.equal(config.secretKey, 'sk_live_prod_456')
  assert.equal(config.publishableKey, 'pk_live_prod_456')
  assert.equal(config.webhookSecret, 'whsec_prod_456')
  console.log('✓ Vercel Production (VERCEL_ENV=production) allows LIVE mode with live keys')
}

// 16. Vercel Production + LIVE mode with mismatched sk_test key -> fails
{
  assert.throws(
    () =>
      getStripeConfig({
        VERCEL_ENV: 'production',
        NODE_ENV: 'production',
        STRIPE_MODE: 'live',
        STRIPE_LIVE_SECRET_KEY: 'sk_test_accidental_test_key',
        NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY: 'pk_live_prod_456',
        STRIPE_LIVE_WEBHOOK_SECRET: 'whsec_prod_456',
      }),
    /STRIPE_LIVE_SECRET_KEY must begin with "sk_live_"/
  )
  console.log('✓ Vercel Production with mismatched sk_test key throws error')
}

// 17. Local/CI fallback: VERCEL_ENV absent, NODE_ENV=production + TEST mode -> strictly blocked
{
  assert.throws(
    () =>
      getStripeConfig({
        NODE_ENV: 'production',
        STRIPE_MODE: 'test',
        STRIPE_TEST_SECRET_KEY: 'sk_test_local_123',
        NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY: 'pk_test_local_123',
        STRIPE_TEST_WEBHOOK_SECRET: 'whsec_local_123',
      }),
    /STRIPE_MODE="test" is blocked in production/
  )
  console.log('✓ Local/CI fallback without VERCEL_ENV strictly blocks TEST mode when NODE_ENV=production')
}

// 18. Local/CI fallback: VERCEL_ENV absent, NODE_ENV=test + TEST mode -> succeeds
{
  const config = getStripeConfig({
    NODE_ENV: 'test',
    STRIPE_MODE: 'test',
    STRIPE_TEST_SECRET_KEY: 'sk_test_local_789',
    NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY: 'pk_test_local_789',
    STRIPE_TEST_WEBHOOK_SECRET: 'whsec_local_789',
  })
  assert.equal(config.mode, 'test')
  assert.equal(config.secretKey, 'sk_test_local_789')
  console.log('✓ Local/CI fallback without VERCEL_ENV allows TEST mode when NODE_ENV=test')
}

console.log('\nAll Stripe configuration tests passed successfully!')
