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

function describeError(err: unknown): {
  name: string
  message: string
  code?: string
  statusCode?: number
  isCognitoAuthError: boolean
} {
  if (err instanceof Error) {
    const awsError = err as Error & {
      name?: string
      code?: string
      $metadata?: {
        httpStatusCode?: number
        requestId?: string
      }
    }

    const name = awsError.name || 'Error'
    const code = awsError.code

    const cognitoAuthErrors = new Set([
      'NotAuthorizedException',
      'UserNotFoundException',
      'PasswordResetRequiredException',
      'UserNotConfirmedException',
      'TooManyRequestsException',
    ])

    return {
      name,
      message: awsError.message,
      code,
      statusCode: awsError.$metadata?.httpStatusCode,
      isCognitoAuthError:
        cognitoAuthErrors.has(name) || cognitoAuthErrors.has(code ?? ''),
    }
  }

  return {
    name: 'UnknownError',
    message: String(err),
    isCognitoAuthError: false,
  }
}

export async function POST(req: Request) {
  const parsed = loginSchema.safeParse(await req.json().catch(() => null))

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 400 },
    )
  }

  try {
    console.log('[auth/login] Starting Cognito authentication')

    const auth = await signInWithCognito(
      parsed.data.email,
      parsed.data.password,
    )

    console.log('[auth/login] Cognito authentication succeeded')

    const response = NextResponse.json({ ok: true })
    setAuthCookies(response, auth)

    captureServerEvent(parsed.data.email, 'auth_sign_in')

    return response
  } catch (err) {
    const details = describeError(err)

    console.error('[auth/login] Cognito authentication failed', {
      name: details.name,
      code: details.code,
      statusCode: details.statusCode,
      message: details.message,
      isCognitoAuthError: details.isCognitoAuthError,
    })

    captureServerError(parsed.data.email, err, {
      route: '/api/auth/login',
      cognito_error_name: details.name,
      cognito_error_code: details.code,
      cognito_http_status: details.statusCode,
      cognito_auth_error: details.isCognitoAuthError,
    })

    if (details.isCognitoAuthError) {
      return NextResponse.json(
        { error: 'Sign in failed. Check your email and password.' },
        { status: 401 },
      )
    }

    return NextResponse.json(
      { error: 'Authentication service temporarily unavailable.' },
      { status: 503 },
    )
  }
}