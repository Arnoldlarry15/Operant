import { NextResponse } from 'next/server'
import { z } from 'zod'
import { signUpWithCognito } from '@/lib/cognito'
import { captureServerError, captureServerEvent } from '@/lib/posthog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const signUpSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8).max(4096),
})

export async function POST(req: Request) {
  const parsed = signUpSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid account details' }, { status: 400 })
  }

  try {
    await signUpWithCognito(parsed.data)
    captureServerEvent(parsed.data.email, 'auth_sign_up')
    return NextResponse.json({ ok: true })
  } catch (err) {
    captureServerError(parsed.data.email, err, { route: '/api/auth/sign-up' })
    return NextResponse.json({ error: 'Could not create account. Try signing in if this email already exists.' }, { status: 400 })
  }
}
