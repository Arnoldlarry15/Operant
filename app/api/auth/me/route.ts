import { NextResponse } from 'next/server'
import { getCognitoUserFromAccessToken, getCognitoUserFromCookies, refreshCognitoSession, setAuthCookies } from '@/lib/cognito'
import { ensureUser } from '@/lib/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  let user = await getCognitoUserFromCookies()

  let refreshedAuth = null

  if (!user) {
    try {
      refreshedAuth = await refreshCognitoSession()
    } catch (err) {
      console.error('[auth/me] refresh error:', err)
    }
    if (refreshedAuth?.AccessToken) {
      user = await getCognitoUserFromAccessToken(refreshedAuth.AccessToken)
    }
  }

  if (!user) {
    return NextResponse.json({ user: null, profile: null }, { status: 401 })
  }

  let profile = null
  try {
    const dbUser = await ensureUser(user.email, user.name)
    profile = {
      id: dbUser.id,
      display_name: dbUser.name,
    }
  } catch (err) {
    console.error('[auth/me] ensureUser fallback (database error):', err)
    profile = {
      id: user.id,
      display_name: user.name ?? user.email.split('@')[0],
    }
  }

  const response = NextResponse.json({
    user,
    profile,
  })

  if (refreshedAuth) await setAuthCookies(response, refreshedAuth)
  return response
}
