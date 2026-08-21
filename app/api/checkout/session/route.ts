import { NextResponse } from 'next/server'
import { startCheckoutSession } from '@/lib/stripe-actions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    console.log('[POST /api/checkout/session] Cookie header:', req.headers.get('cookie'))
    const body = await req.json().catch(() => null)
    const items = body?.items ?? body
    const result = await startCheckoutSession(items)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[POST /api/checkout/session] Error details:', err)
    const message = err instanceof Error ? err.message : 'Checkout could not be started.'
    const status = message === 'Not authenticated' ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
