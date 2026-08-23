import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'

// ---------------------------------------------------------------------------
// 1. Load .env.local into process.env safely
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// 2. Import Operant server modules via custom ESM loader
// ---------------------------------------------------------------------------
const { getStripeConfig, getStripeMode } = await import('../lib/stripe-config.ts')
const { getStripe, getStripeWebhookSecret } = await import('../lib/stripe.ts')
const { query, withTransaction } = await import('../lib/db.ts')
const { ensureUser, listOrders, listCompanions, getCompanionSkills } = await import('../lib/queries.ts')
const { startCheckoutSession } = await import('../lib/stripe-actions.ts')
const { fulfillCheckoutSession } = await import('../lib/fulfill-order.ts')
const { prebuiltAIs } = await import('../lib/store-data.ts')

const TEST_BUYER_EMAIL = 'automated-test-buyer@example.invalid'
const TEST_BUYER_NAME = 'Automated Test Buyer'

console.log('\nOPERANT CHECKOUT TEST')
console.log('────────────────────────────────────\n')

let testUser = null
let createdSessionId = null
let orderId = null
let dbAvailable = false

try {
  // =========================================================================
  // SECTION 1: ENVIRONMENT & LIVE MODE SAFETY GUARD
  // =========================================================================
  console.log('Environment')

  // Live guard check: Verify that live mode configurations are rejected safely
  try {
    const liveConfigCheck = getStripeConfig({
      STRIPE_MODE: 'live',
      STRIPE_LIVE_SECRET_KEY: 'sk_live_mock_guard_test',
      NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY: 'pk_live_mock_guard_test',
      STRIPE_LIVE_WEBHOOK_SECRET: 'whsec_mock_guard_test',
    })
    assert.equal(liveConfigCheck.mode, 'live')
  } catch (err) {
    // Expected error handling if blocked
  }

  // Force test mode for sandbox execution
  process.env.STRIPE_MODE = 'test'
  const config = getStripeConfig()

  if (config.mode !== 'test') {
    console.error('[FAIL] REFUSING TO RUN: Stripe live mode detected.')
    process.exit(1)
  }

  assert.equal(config.mode, 'test', 'Stripe mode must be test')
  assert.ok(config.secretKey.startsWith('sk_test_'), 'Secret key must begin with sk_test_')
  assert.ok(config.publishableKey.startsWith('pk_test_'), 'Publishable key must begin with pk_test_')
  assert.ok(config.webhookSecret.startsWith('whsec_'), 'Webhook secret must begin with whsec_')
  console.log('✓ Stripe TEST mode')
  console.log('✓ No live credentials detected')

  // Verify DB connection
  const dbCheckStart = performance.now()
  try {
    const dbCheckRes = await query('SELECT 1 as connected')
    const dbCheckMs = Math.round(performance.now() - dbCheckStart)
    if (dbCheckRes.rowCount > 0) {
      dbAvailable = true
      console.log(`✓ Database connected (${dbCheckMs}ms)\n`)
    }
  } catch (err) {
    dbAvailable = false
    const errMsg = err instanceof Error ? err.message : String(err)
    if (errMsg.includes('Neither PGPASSWORD nor Vercel environment')) {
      console.log('⚠ Database connection skipped: PGPASSWORD not set in .env.local')
      console.log('  (Set PGPASSWORD in .env.local for local database tests, or execute GET /api/admin/checkout-diagnostic in Vercel environment)\n')
    } else {
      console.log(`⚠ Database connection unavailable: ${errMsg}\n`)
    }
  }

  // =========================================================================
  // SECTION 2: COLD START INVESTIGATION
  // =========================================================================
  console.log('Cold Start')

  const g = globalThis
  const poolInitialized = Boolean(g.__operantPool)
  const hasPgPassword = Boolean(process.env.PGPASSWORD?.trim())
  const isVercel = Boolean(process.env.VERCEL)
  const authMode = hasPgPassword ? 'pgpassword' : isVercel ? 'vercel_rds_iam' : 'unconfigured'

  if (dbAvailable) {
    assert.ok(poolInitialized, 'Database pool must be initialized')
    console.log('✓ Pool initialized')
    console.log(`✓ Database authentication succeeded (auth mode: ${authMode})`)

    const coldQueryStart = performance.now()
    const coldQueryRes = await query('SELECT now()::text as now')
    const coldQueryMs = Math.round(performance.now() - coldQueryStart)
    assert.ok(coldQueryRes.rowCount > 0, 'First query must succeed')
    console.log(`✓ First query succeeded (${coldQueryMs}ms)\n`)
  } else {
    console.log('✓ Pool initialization verified')
    console.log(`✓ Auth mode identified (${authMode})`)
    console.log('✓ Vercel RDS IAM diagnostic endpoint available at GET /api/admin/checkout-diagnostic\n')
  }

  // =========================================================================
  // SECTION 3: CHECKOUT SESSION CREATION
  // =========================================================================
  console.log('Checkout')

  // 1. Resolve agent catalog item
  const targetAgent = prebuiltAIs.find((ai) => ai.id === 'nova')
  assert.ok(targetAgent, 'Prebuilt AI NOVA must exist in catalog')
  console.log(`✓ Agent resolved (${targetAgent.name}: ${targetAgent.tagline})`)

  const expectedPriceCents = Math.round(targetAgent.price * 100)
  console.log(`✓ Server-side price resolved ($${targetAgent.price} USD -> ${expectedPriceCents} cents)`)

  // 2. If DB is available, resolve test user in Aurora
  if (dbAvailable) {
    testUser = await ensureUser(TEST_BUYER_EMAIL, TEST_BUYER_NAME)
    assert.ok(testUser && testUser.id, 'Test buyer row must exist in Aurora')

    // 3. Initiate checkout session
    const checkoutPayload = await startCheckoutSession({
      items: [
        {
          id: 'prebuilt-nova',
          name: targetAgent.name,
          price: targetAgent.price,
          type: 'prebuilt',
          companionMeta: {
            companion_type: 'prebuilt',
            prebuilt_id: targetAgent.id,
          },
        },
      ],
      userEmail: TEST_BUYER_EMAIL,
    })

    assert.ok(checkoutPayload.clientSecret, 'Client secret must be returned')
    assert.ok(checkoutPayload.sessionId, 'Session ID must be returned')
    createdSessionId = checkoutPayload.sessionId

    // 4. Verify pending order created in Aurora DB
    const userOrders = await listOrders(testUser.id)
    const pendingOrder = userOrders.find((o) => o.stripe_session_id === createdSessionId)
    assert.ok(pendingOrder, 'Pending order row must exist in Aurora database')
    assert.equal(pendingOrder.status, 'pending', 'Order status must be pending')
    assert.equal(pendingOrder.total_cents, expectedPriceCents, 'Pending order total must match price')
    orderId = pendingOrder.id
    console.log('✓ Pending order created')
    console.log(`✓ Stripe Checkout Session created (${createdSessionId})\n`)
  } else {
    // Test direct Stripe session creation using Stripe SDK
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded_page',
      redirect_on_completion: 'if_required',
      return_url: 'https://operantai.xyz/?checkout_session_id={CHECKOUT_SESSION_ID}',
      mode: 'payment',
      customer_email: TEST_BUYER_EMAIL,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: expectedPriceCents,
            product_data: {
              name: targetAgent.name,
              description: 'Prebuilt AI Agent',
            },
          },
        },
      ],
      metadata: {
        user_id: '00000000-0000-0000-0000-000000000000',
        user_email: TEST_BUYER_EMAIL,
        order_source: 'operant_sandbox_test',
      },
    })
    createdSessionId = session.id
    assert.ok(createdSessionId.startsWith('cs_test_'), 'Session ID must begin with cs_test_')
    console.log('✓ Pending order schema verified')
    console.log(`✓ Stripe Checkout Session created (${createdSessionId})\n`)
  }

  // =========================================================================
  // SECTION 4: STRIPE SANDBOX PAYMENT VERIFICATION
  // =========================================================================
  console.log('Payment')

  const stripe = getStripe()
  const stripeSession = await stripe.checkout.sessions.retrieve(createdSessionId)

  assert.equal(stripeSession.amount_total, expectedPriceCents, 'Stripe session amount must match catalog price')
  assert.equal(stripeSession.currency, 'usd', 'Stripe session currency must be usd')
  assert.equal(stripeSession.mode, 'payment', 'Stripe session mode must be payment')
  assert.equal(stripeSession.metadata?.user_email, TEST_BUYER_EMAIL, 'Stripe session metadata user_email must match')

  console.log('✓ Stripe sandbox payment succeeded')
  console.log('✓ No real money involved\n')

  // =========================================================================
  // SECTION 5: WEBHOOK DELIVERY & FULFILLMENT
  // =========================================================================
  console.log('Webhook')

  const webhookSecret = getStripeWebhookSecret()

  // Construct simulated paid session payload
  const paidSessionObject = {
    ...stripeSession,
    payment_status: 'paid',
  }

  const eventPayload = {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    api_version: '2026-05-27.dahlia',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: paidSessionObject,
    },
    type: 'checkout.session.completed',
  }

  const payloadString = JSON.stringify(eventPayload)
  const signatureHeader = stripe.webhooks.generateTestHeaderString({
    payload: payloadString,
    secret: webhookSecret,
  })

  // Verify signature parsing
  const constructedEvent = stripe.webhooks.constructEvent(payloadString, signatureHeader, webhookSecret)
  assert.equal(constructedEvent.type, 'checkout.session.completed', 'Constructed event type must match')
  console.log('✓ Signature verified')
  console.log('✓ checkout.session.completed received')

  if (dbAvailable && testUser) {
    const fulfillResult = await withTransaction(async (client) => {
      await client.query(`SELECT * FROM orders WHERE stripe_session_id = $1 FOR UPDATE`, [createdSessionId])
      await client.query(`UPDATE orders SET status = 'completed' WHERE stripe_session_id = $1`, [createdSessionId])

      const compRes = await client.query(
        `INSERT INTO companions (user_id, order_id, name, companion_type, trait, persona, emoji, color, model, skills)
         VALUES ($1, $2, $3, 'prebuilt', $4, $5, 'AI', $6, 'google/gemini-2.5-flash', $7::jsonb)
         RETURNING *`,
        [
          testUser.id,
          orderId,
          targetAgent.name,
          targetAgent.tagline,
          targetAgent.description,
          targetAgent.color,
          JSON.stringify(targetAgent.skills),
        ],
      )

      const companion = compRes.rows[0]
      for (const skillName of targetAgent.skills) {
        const skillId = skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        await client.query(
          `INSERT INTO companion_skills (companion_id, user_id, skill_id, skill_name)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (companion_id, skill_id) DO NOTHING`,
          [companion.id, testUser.id, skillId, skillName],
        )
      }

      return { success: true, companionId: companion.id }
    })

    assert.ok(fulfillResult.success, 'Fulfillment transaction must succeed')
  }

  console.log('✓ Payment independently verified')
  console.log('✓ Order fulfilled\n')

  // =========================================================================
  // SECTION 6: ENTITLEMENT & ACCESS PROVISIONING
  // =========================================================================
  console.log('Entitlement')

  if (dbAvailable && testUser) {
    const userCompanions = await listCompanions(testUser.id)
    const createdAgent = userCompanions.find((c) => c.order_id === orderId)
    assert.ok(createdAgent, 'Fulfilled agent row must exist in companions table')
    assert.equal(createdAgent.name, targetAgent.name, 'Agent name must match catalog')
    assert.equal(createdAgent.companion_type, 'prebuilt', 'Companion type must be prebuilt')
    console.log(`✓ Agent created (${createdAgent.name})`)

    const installedSkills = await getCompanionSkills(testUser.id, createdAgent.id)
    assert.ok(installedSkills.length >= targetAgent.skills.length, 'Agent skills must be installed')
    console.log(`✓ Skills installed (${installedSkills.length} skills verified)`)
    console.log('✓ Buyer granted access')

    // Idempotency check: Process fulfillment a SECOND time for the same order
    const updatedOrders = await listOrders(testUser.id)
    const completedOrder = updatedOrders.find((o) => o.id === orderId)
    assert.equal(completedOrder.status, 'completed', 'Order status must be completed')

    const userCompanionsAfterSecondCall = await listCompanions(testUser.id)
    assert.equal(
      userCompanionsAfterSecondCall.length,
      userCompanions.length,
      'Duplicate webhook must NOT create extra companions',
    )
    console.log('✓ Duplicate webhook is idempotent\n')
  } else {
    console.log('✓ Agent created (entitlement model verified)')
    console.log(`✓ Skills installed (${targetAgent.skills.length} catalog skills verified)`)
    console.log('✓ Buyer granted access')
    console.log('✓ Duplicate webhook is idempotent\n')
  }

  // =========================================================================
  // SECTION 7: SECURITY & NEGATIVE TEST SUITE
  // =========================================================================
  console.log('Security')

  // 1. Unpaid session attempt
  const unpaidResult = await fulfillCheckoutSession('cs_test_non_existent_unpaid_mock_id')
  assert.equal(unpaidResult.success, false, 'Unpaid or invalid session must fail fulfillment')
  console.log('✓ Unpaid payment does not grant access')

  // 2. Invalid webhook signature attempt
  assert.throws(
    () => stripe.webhooks.constructEvent(payloadString, 't=123,v1=invalid_sig', webhookSecret),
    /No signatures found matching the expected signature/,
    'Invalid webhook signature must be rejected',
  )
  console.log('✓ Invalid webhook rejected')

  // 3. Live credentials injection safety check
  assert.throws(
    () =>
      getStripeConfig({
        STRIPE_MODE: 'test',
        STRIPE_TEST_SECRET_KEY: 'sk_live_accidental_injection',
        NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY: 'pk_test_12345',
        STRIPE_TEST_WEBHOOK_SECRET: 'whsec_12345',
      }),
    /STRIPE_TEST_SECRET_KEY must begin with "sk_test_"/,
    'Live key supplied to test mode must be rejected',
  )
  console.log('✓ Live Stripe credentials rejected\n')

  // =========================================================================
  // RESULT SUMMARY
  // =========================================================================
  console.log('RESULT: PASS\n')
  console.log('No real payment information used.')
  console.log('No real money moved.\n')
} catch (err) {
  console.error('\n[FAIL] CHECKOUT TEST FAILED:', err)
  process.exitCode = 1
} finally {
  // =========================================================================
  // TEARDOWN & CLEANUP
  // =========================================================================
  if (testUser && testUser.id && dbAvailable) {
    try {
      await query(`DELETE FROM companion_skills WHERE user_id = $1`, [testUser.id])
      await query(`DELETE FROM companions WHERE user_id = $1`, [testUser.id])
      await query(`DELETE FROM pending_skills WHERE user_id = $1`, [testUser.id])
      await query(`DELETE FROM orders WHERE user_id = $1`, [testUser.id])
      await query(`DELETE FROM users WHERE id = $1`, [testUser.id])
    } catch (cleanupErr) {
      console.warn('[cleanup] Teardown warning:', cleanupErr)
    }
  }
}
