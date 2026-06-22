import { NextResponse } from 'next/server'
import { z } from 'zod'
import { confirmSignUpWithCognito } from '@/lib/cognito'
import { captureServerError, captureServerEvent } from '@/lib/posthog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const confirmSignUpSchema = z.object({
  email: z.string().trim().email(),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
})

export async function POST(req: Request) {
  const parsed = confirmSignUpSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid confirmation details' }, { status: 400 })
  }

  try {
    await confirmSignUpWithCognito(parsed.data.email, parsed.data.code)
    captureServerEvent(parsed.data.email, 'auth_confirm_signup')
    return NextResponse.json({ ok: true })
  } catch (err) {
    captureServerError(parsed.data.email, err, { route: '/api/auth/confirm-signup' })
    return NextResponse.json(
      { error: 'Could not confirm account. Check the code and try again, or sign up again.' },
      { status: 400 }
    )
  }
}
