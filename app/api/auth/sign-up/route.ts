import { NextResponse } from 'next/server'
import { z } from 'zod'
import { signUpWithCognito } from '@/lib/cognito'
import { captureServerError, captureServerEvent } from '@/lib/posthog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const signUpSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8).max(4096),
})

export function describeSignUpError(err: unknown): { error: string; status: number } {
  if (err instanceof Error) {
    const awsError = err as Error & { name?: string; code?: string }
    const name = awsError.name || awsError.code || 'Error'

    switch (name) {
      case 'UsernameExistsException':
        return {
          error: 'An account with this email already exists. Try signing in instead.',
          status: 400,
        }
      case 'InvalidPasswordException':
        return {
          error:
            'Password does not meet requirements: must be at least 8 characters and include uppercase, lowercase, numbers, and symbols.',
          status: 400,
        }
      case 'InvalidParameterException':
        return {
          error: awsError.message || 'Invalid account details provided.',
          status: 400,
        }
      case 'TooManyRequestsException':
      case 'LimitExceededException':
        return {
          error: 'Too many attempts. Please wait a moment and try again.',
          status: 429,
        }
      case 'CodeDeliveryFailureException':
        return {
          error: 'Account created, but verification code could not be sent. Please contact support.',
          status: 500,
        }
      default:
        console.error('[sign-up] Cognito error:', name, awsError.message)
        return {
          error: 'Authentication service temporarily unavailable. Please try again later.',
          status: 503,
        }
    }
  }

  return {
    error: 'Authentication service temporarily unavailable. Please try again later.',
    status: 503,
  }
}

export async function POST(req: Request) {
  let body: unknown

  try {
    body = await req.json()
  } catch (err) {
    console.error('[sign-up] Request JSON parse failed:', err)
    return NextResponse.json({ error: 'Invalid account details' }, { status: 400 })
  }

  const parsed = signUpSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid account details' }, { status: 400 })
  }

  try {
    await signUpWithCognito(parsed.data)
    captureServerEvent(parsed.data.email, 'auth_sign_up')
    return NextResponse.json({ ok: true })
  } catch (err) {
    captureServerError(parsed.data.email, err, { route: '/api/auth/sign-up' })
    const { error, status } = describeSignUpError(err)
    return NextResponse.json({ error }, { status })
  }
}
