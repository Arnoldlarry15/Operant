import { getCognitoUserFromCookies } from './cognito'
import { ensureUser } from './queries'
import type { UserRow } from './types'
/**
 * Resolves the currently authenticated user (via AWS Cognito) and ensures a
 * matching row exists in the Aurora `users` table. Returns null if there is no
 * authenticated session.
 *
 * This is the single bridge between Cognito (auth) and Aurora (data). Every
 * Aurora query is scoped to the returned `id`.
 */
export async function getCurrentUser(): Promise<UserRow | null> {
  const user = await getCognitoUserFromCookies()

  if (!user?.email) return null

  try {
    return await ensureUser(user.email, user.name)
  } catch (err) {
    console.error('[getCurrentUser] Database fallback:', err)
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }
}
