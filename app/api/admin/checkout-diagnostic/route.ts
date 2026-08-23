import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { startCheckoutSession } from '@/lib/stripe-actions'
import { getStripeMode } from '@/lib/stripe-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const tokenFromHeader = authHeader?.replace(/^Bearer\s+/i, '').trim()
  const tokenFromQuery = req.nextUrl.searchParams.get('token')?.trim()
  const token = tokenFromHeader || tokenFromQuery

  const expectedToken = process.env.READINESS_TOKEN
  if (!expectedToken || token !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized diagnostic request' }, { status: 401 })
  }

  const g = globalThis as unknown as {
    __operantPool?: unknown
    __operantRdsToken?: string
    __operantRdsTokenExpiresAt?: number
  }

  const poolWasInitializedBefore = Boolean(g.__operantPool)
  const rdsTokenWasCachedBefore = Boolean(
    g.__operantRdsToken && g.__operantRdsTokenExpiresAt && Date.now() < g.__operantRdsTokenExpiresAt,
  )

  const isVercel = Boolean(process.env.VERCEL)
  const hasPgPassword = Boolean(process.env.PGPASSWORD?.trim())
  const authMode = hasPgPassword ? 'pgpassword' : isVercel ? 'vercel_rds_iam' : 'unconfigured'

  // Diagnostic 1: First DB Query
  const startQueryTime = performance.now()
  let firstQuerySuccess = false
  let firstQueryError: string | null = null
  try {
    const res = await query<{ now: string }>('SELECT now()::text as now')
    firstQuerySuccess = res.rowCount > 0
  } catch (err) {
    firstQueryError = err instanceof Error ? err.message : String(err)
  }
  const firstQueryMs = Math.round(performance.now() - startQueryTime)

  const poolIsInitializedAfter = Boolean(g.__operantPool)
  const rdsTokenIsCachedAfter = Boolean(
    g.__operantRdsToken && g.__operantRdsTokenExpiresAt && Date.now() < g.__operantRdsTokenExpiresAt,
  )

  // Diagnostic 2: Warm DB Query
  const startWarmQueryTime = performance.now()
  let warmQuerySuccess = false
  let warmQueryError: string | null = null
  try {
    const res = await query<{ now: string }>('SELECT now()::text as now')
    warmQuerySuccess = res.rowCount > 0
  } catch (err) {
    warmQueryError = err instanceof Error ? err.message : String(err)
  }
  const warmQueryMs = Math.round(performance.now() - startWarmQueryTime)

  // Diagnostic 3: Stripe Checkout Session creation in TEST mode
  const startCheckoutTime = performance.now()
  let checkoutSessionSuccess = false
  let checkoutSessionError: string | null = null
  let sessionId: string | null = null
  let stripeMode: string = 'unknown'

  try {
    stripeMode = getStripeMode()
    if (stripeMode === 'test') {
      const result = await startCheckoutSession({
        items: [
          {
            id: 'prebuilt-nova',
            name: 'NOVA Cold Start Diagnostic Test',
            price: 89,
            type: 'prebuilt',
            companionMeta: {
              companion_type: 'prebuilt',
              prebuilt_id: 'nova',
            },
          },
        ],
        userEmail: 'cold-start-diagnostic@operant.invalid',
      })
      sessionId = result.sessionId
      checkoutSessionSuccess = Boolean(result.clientSecret && result.sessionId)
    } else {
      checkoutSessionError = 'Diagnostic checkout skipped: STRIPE_MODE is live.'
    }
  } catch (err) {
    checkoutSessionError = err instanceof Error ? err.message : String(err)
  }
  const checkoutSessionMs = Math.round(performance.now() - startCheckoutTime)

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: {
      stripeMode,
      authMode,
      isVercel,
    },
    coldStart: {
      poolWasInitializedBefore,
      poolIsInitializedAfter,
      rdsTokenWasCachedBefore,
      rdsTokenIsCachedAfter,
      rdsTokenGeneratedDuringRequest: !rdsTokenWasCachedBefore && rdsTokenIsCachedAfter,
      firstQuerySuccess,
      firstQueryMs,
      firstQueryError,
      warmQuerySuccess,
      warmQueryMs,
      warmQueryError,
    },
    checkout: {
      checkoutSessionSuccess,
      checkoutSessionMs,
      sessionId,
      checkoutSessionError,
    },
  })
}
