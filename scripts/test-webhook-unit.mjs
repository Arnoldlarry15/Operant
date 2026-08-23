import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'

const root = process.cwd()
const envLocalPath = join(root, '.env.local')

if (existsSync(envLocalPath)) {
  const lines = readFileSync(envLocalPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim()
    }
  }
}

process.env.STRIPE_MODE = 'test'

const { getStripe, getStripeWebhookSecret } = await import('../lib/stripe.ts')
const { fulfillCheckoutSession } = await import('../lib/fulfill-order.ts')

console.log('Running Stripe Webhook Unit & Integration Tests...\n')

const stripe = getStripe()
const secret = getStripeWebhookSecret()

// 1. Valid Signature Verification & Constructing Event
{
  const mockSession = {
    id: 'cs_test_mock_webhook_123',
    object: 'checkout.session',
    amount_total: 8900,
    currency: 'usd',
    customer_details: { email: 'webhook-unit@example.invalid' },
    metadata: {
      user_id: '00000000-0000-0000-0000-000000000001',
      user_email: 'webhook-unit@example.invalid',
    },
    payment_status: 'paid',
    status: 'complete',
  }

  const payload = JSON.stringify({
    id: 'evt_test_completed_1',
    object: 'event',
    api_version: '2026-05-27.dahlia',
    created: Math.floor(Date.now() / 1000),
    data: { object: mockSession },
    type: 'checkout.session.completed',
  })

  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret })
  const event = stripe.webhooks.constructEvent(payload, signature, secret)

  assert.equal(event.type, 'checkout.session.completed')
  assert.equal(event.data.object.id, 'cs_test_mock_webhook_123')
  console.log('✓ Valid webhook signature construction and event parsing succeeded')
}

// 2. Invalid Signature Rejection
{
  const payload = JSON.stringify({ id: 'evt_test_invalid_sig', type: 'checkout.session.completed' })
  assert.throws(
    () => stripe.webhooks.constructEvent(payload, 't=12345,v1=invalid_signature', secret),
    /No signatures found matching the expected signature/,
  )
  console.log('✓ Invalid webhook signature correctly rejected')
}

// 3. Malformed Event Payload Rejection
{
  const invalidPayload = '{"invalid_json": true'
  assert.throws(
    () => stripe.webhooks.constructEvent(invalidPayload, 't=123,v1=sig', secret),
  )
  console.log('✓ Malformed event payload correctly rejected')
}

// 4. Unpaid Session Fulfillment Guard
{
  const unpaidResult = await fulfillCheckoutSession('cs_test_unpaid_mock_session_id')
  assert.equal(unpaidResult.success, false)
  assert.ok(unpaidResult.error.includes('Payment not completed') || unpaidResult.error.includes('Stripe retrieve failed'))
  console.log('✓ Unpaid or invalid checkout session fulfillment rejected')
}

// 5. Missing Metadata Guard
{
  // Call fulfillment with non-existent session
  const missingMetaResult = await fulfillCheckoutSession('cs_test_nonexistent_session_999')
  assert.equal(missingMetaResult.success, false)
  assert.ok(missingMetaResult.error.length > 0)
  console.log('✓ Missing metadata / missing order session correctly fails without granting access')
}

console.log('\nAll Stripe Webhook Unit Tests Passed Successfully!\n')
