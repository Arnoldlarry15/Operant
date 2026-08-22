import 'server-only'

import {
  CognitoIdentityProviderClient,
  GetUserCommand,
  InitiateAuthCommand,
  SignUpCommand,
  type AuthenticationResultType,
  type AttributeType,
} from '@aws-sdk/client-cognito-identity-provider'
import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import type { NextResponse } from 'next/server'
import { getAwsRegion } from '@/lib/aws'

export type CognitoAppUser = {
  id: string
  email: string
  name: string | null
  user_metadata: {
    display_name?: string | null
    name?: string | null
  }
}

export const authCookieNames = {
  access: 'operant_access_token',
  id: 'operant_id_token',
  refresh: 'operant_refresh_token',
  expiresAt: 'operant_auth_expires_at',
} as const

let client: CognitoIdentityProviderClient | null = null

function getCognitoClient(): CognitoIdentityProviderClient {
  client ??= new CognitoIdentityProviderClient({ region: getAwsRegion() })
  return client
}

function getUserPoolClientId(): string {
  const clientId = process.env.COGNITO_USER_POOL_CLIENT_ID
  if (!clientId) throw new Error('COGNITO_USER_POOL_CLIENT_ID is not configured')
  return clientId
}

function getSecretHash(email: string): string | undefined {
  const clientSecret = process.env.COGNITO_USER_POOL_CLIENT_SECRET
  if (!clientSecret) return undefined

  return crypto
    .createHmac('sha256', clientSecret)
    .update(`${email}${getUserPoolClientId()}`)
    .digest('base64')
}

function getAttribute(attributes: AttributeType[] | undefined, name: string): string | null {
  return attributes?.find((attribute) => attribute.Name === name)?.Value ?? null
}

function toAppUser(attributes: AttributeType[] | undefined): CognitoAppUser | null {
  const id = getAttribute(attributes, 'sub')
  const email =
    getAttribute(attributes, 'email') ??
    getAttribute(attributes, 'username') ??
    getAttribute(attributes, 'preferred_username') ??
    (id ? `${id}@cognito.local` : null)
  if (!id || !email) {
    console.error('[toAppUser] Missing sub or email in attributes:', attributes)
    return null
  }

  const name =
    getAttribute(attributes, 'name') ??
    getAttribute(attributes, 'nickname') ??
    email.split('@')[0]

  return {
    id,
    email,
    name,
    user_metadata: {
      display_name: name,
      name,
    },
  }
}

function cookieOptions(maxAge?: number) {
  const secure = process.env.NODE_ENV === 'production'

  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    ...(maxAge ? { maxAge } : {}),
  }
}

export async function setAuthCookies(response: NextResponse, auth: AuthenticationResultType): Promise<void> {
  if (!auth.AccessToken || !auth.IdToken) throw new Error('Cognito did not return access and id tokens')

  const expiresIn = auth.ExpiresIn ?? 3600
  const options = cookieOptions(expiresIn)
  const refreshOptions = cookieOptions(30 * 24 * 60 * 60)

  response.cookies.set(authCookieNames.access, auth.AccessToken, options)
  response.cookies.set(authCookieNames.id, auth.IdToken, options)
  response.cookies.set(authCookieNames.expiresAt, String(Date.now() + expiresIn * 1000), options)

  if (auth.RefreshToken) {
    response.cookies.set(authCookieNames.refresh, auth.RefreshToken, refreshOptions)
  }

  try {
    const cookieStore = await cookies()
    cookieStore.set(authCookieNames.access, auth.AccessToken, options)
    cookieStore.set(authCookieNames.id, auth.IdToken, options)
    cookieStore.set(authCookieNames.expiresAt, String(Date.now() + expiresIn * 1000), options)
    if (auth.RefreshToken) {
      cookieStore.set(authCookieNames.refresh, auth.RefreshToken, refreshOptions)
    }
  } catch {
    // Ignore outside server action / route handler context
  }
}

export async function clearAuthCookies(response: NextResponse): Promise<void> {
  for (const name of Object.values(authCookieNames)) {
    response.cookies.set(name, '', { ...cookieOptions(), maxAge: 0 })
  }
  try {
    const cookieStore = await cookies()
    for (const name of Object.values(authCookieNames)) {
      cookieStore.set(name, '', { ...cookieOptions(), maxAge: 0 })
    }
  } catch {
    // Ignore outside server action / route handler context
  }
}

export async function signInWithCognito(email: string, password: string): Promise<AuthenticationResultType> {
  const secretHash = getSecretHash(email)
  const result = await getCognitoClient().send(
    new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: getUserPoolClientId(),
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        ...(secretHash ? { SECRET_HASH: secretHash } : {}),
      },
    }),
  )

  if (!result.AuthenticationResult) throw new Error('Cognito sign-in did not return a session')
  return result.AuthenticationResult
}

export async function signUpWithCognito(input: {
  email: string
  password: string
  displayName: string
}): Promise<void> {
  const secretHash = getSecretHash(input.email)
  await getCognitoClient().send(
    new SignUpCommand({
      ClientId: getUserPoolClientId(),
      Username: input.email,
      Password: input.password,
      UserAttributes: [
        { Name: 'email', Value: input.email },
        { Name: 'name', Value: input.displayName },
      ],
      ...(secretHash ? { SecretHash: secretHash } : {}),
    }),
  )
}

function extractUsernameFromToken(token?: string | null): string | null {
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'))
    return decoded.email ?? decoded['cognito:username'] ?? decoded.username ?? decoded.cognito_username ?? decoded.sub ?? null
  } catch {
    return null
  }
}

export async function refreshCognitoSession(): Promise<AuthenticationResultType | null> {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get(authCookieNames.refresh)?.value
  const idToken = cookieStore.get(authCookieNames.id)?.value
  const accessToken = cookieStore.get(authCookieNames.access)?.value
  if (!refreshToken) return null

  let secretHash: string | undefined
  const clientSecret = process.env.COGNITO_USER_POOL_CLIENT_SECRET
  if (clientSecret) {
    const username = extractUsernameFromToken(idToken) ?? extractUsernameFromToken(accessToken)
    if (username) {
      secretHash = crypto
        .createHmac('sha256', clientSecret)
        .update(`${username}${getUserPoolClientId()}`)
        .digest('base64')
    }
  }

  try {
    const result = await getCognitoClient().send(
      new InitiateAuthCommand({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: getUserPoolClientId(),
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
          ...(secretHash ? { SECRET_HASH: secretHash } : {}),
        },
      }),
    )

    const authResult = result.AuthenticationResult ?? null
    if (authResult) {
      try {
        const expiresIn = authResult.ExpiresIn ?? 3600
        const options = cookieOptions(expiresIn)
        if (authResult.AccessToken) cookieStore.set(authCookieNames.access, authResult.AccessToken, options)
        if (authResult.IdToken) cookieStore.set(authCookieNames.id, authResult.IdToken, options)
        cookieStore.set(authCookieNames.expiresAt, String(Date.now() + expiresIn * 1000), options)
      } catch {
        // Ignore read-only contexts
      }
    }
    return authResult
  } catch (err) {
    console.error('[refreshCognitoSession] Cognito refresh error:', err)
    return null
  }
}

export async function getCognitoUserFromAccessToken(accessToken: string): Promise<CognitoAppUser | null> {
  try {
    const result = await getCognitoClient().send(new GetUserCommand({ AccessToken: accessToken }))
    return toAppUser(result.UserAttributes)
  } catch (err) {
    console.error('[getCognitoUserFromAccessToken] GetUser error:', err)
    return null
  }
}

function getCognitoUserFromIdToken(idToken: string): CognitoAppUser | null {
  try {
    const parts = idToken.split('.')
    if (parts.length !== 3) return null
    const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'))
    const id = decoded.sub
    const email = decoded.email ?? decoded['cognito:username'] ?? decoded.username
    if (!id || !email) return null
    const name = decoded.name ?? decoded.nickname ?? email.split('@')[0]
    return {
      id,
      email,
      name,
      user_metadata: {
        display_name: name,
        name,
      },
    }
  } catch {
    return null
  }
}

export async function getCognitoUserFromCookies(): Promise<CognitoAppUser | null> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(authCookieNames.access)?.value
  const idToken = cookieStore.get(authCookieNames.id)?.value

  if (accessToken) {
    const user = await getCognitoUserFromAccessToken(accessToken)
    if (user) return user
  }

  try {
    const refreshed = await refreshCognitoSession()
    if (refreshed?.AccessToken) {
      const user = await getCognitoUserFromAccessToken(refreshed.AccessToken)
      if (user) return user
    }
  } catch (err) {
    console.error('[getCognitoUserFromCookies] Refresh session fallback error:', err)
  }

  if (idToken) {
    const userFromId = getCognitoUserFromIdToken(idToken)
    if (userFromId) return userFromId
  }

  return null
}

export function hasCognitoConfig(): boolean {
  return Boolean(process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_USER_POOL_CLIENT_ID)
}
