import { NextResponse } from 'next/server'
import { z } from 'zod'
import { signInWithCognito, setAuthCookies } from '@/lib/cognito'
import { captureServerError, captureServerEvent } from '@/lib/posthog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(4096),
})

export async function POST(req: Request) {
  const parsed = loginSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 })
  }

  try {
    const auth = await signInWithCognito(parsed.data.email, parsed.data.password)
    const response = NextResponse.json({ ok: true })
    setAuthCookies(response, auth)
    captureServerEvent(parsed.data.email, 'auth_sign_in')
    return response
  } catch (err) {
    console.error('[auth/login] Cognito error:', err)
    captureServerError(parsed.data.email, err, { route: '/api/auth/login' })
    // TEMPORARY: expose raw error for debugging, remove before launch
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    return NextResponse.json({ error: message }, { status: 401 })
  }
}