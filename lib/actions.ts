'use server'

import { getCurrentUser } from '@/lib/auth'
import type { CheckoutCartItem } from '@/lib/checkout-types'
import { signUpWithCognito } from '@/lib/cognito'
import { z } from 'zod'

// Verify query is imported above
import {
  listCompanions,
  getCompanion as getCompanionQuery,
  getConversation,
  getCompanionSkills,
  listOrders,
} from '@/lib/queries'

// Auth always goes through Cognito; data always goes through Aurora.

export async function signUp(email: string, password: string, displayName: string) {
  try {
    await signUpWithCognito({
    email,
    password,
      displayName,
    })
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
  return { success: true }
}

export async function signIn(email: string, password: string) {
  void email
  void password
  return { error: 'Use the Cognito-backed /api/auth/login route so auth cookies can be set securely.' }
}

export async function signOut() {
  return { error: 'Use the Cognito-backed /api/auth/logout route so auth cookies can be cleared securely.' }
}

export async function getUser() {
  return getCurrentUser()
}

// Agents

export async function getCompanion(id: string) {
  const user = await getCurrentUser()
  if (!user) return null
  return getCompanionQuery(user.id, id)
}

export async function getInstalledSkills(companionId: string) {
  const user = await getCurrentUser()
  if (!user) return []
  return getCompanionSkills(user.id, companionId)
}

export async function getCompanions() {
  const user = await getCurrentUser()
  if (!user) return []
  return listCompanions(user.id)
}

// Messages

export async function getMessages(companionId: string) {
  const user = await getCurrentUser()
  if (!user) return []
  const rows = await getConversation(user.id, companionId, 100)
  // Map Aurora role ('user'|'assistant') to UI role ('user'|'ai')
  return rows.map((r) => ({
    id: r.id,
    role: r.role === 'assistant' ? 'ai' : 'user' as 'user' | 'ai',
    content: r.content,
    created_at: r.created_at,
  }))
}

// Orders

export async function getOrders() {
  const user = await getCurrentUser()
  if (!user) return []
  return listOrders(user.id)
}

// Checkout

/** Server-side canonical price lookup - never trust client-submitted prices. */
export async function checkout(items: CheckoutCartItem[]) {
  void items
  return { error: 'Direct checkout is disabled. Use Stripe Checkout.' }
}

// Pending Skills

const assignPendingSkillSchema = z.object({
  pendingSkillId: z.string().uuid('pendingSkillId must be a valid UUID'),
  companionId: z.string().uuid('companionId must be a valid UUID'),
  skillId: z.string().trim().min(1).max(120),
})

export async function getPendingSkills() {
  const user = await getCurrentUser()
  if (!user) return []
  const { listPendingSkills } = await import('@/lib/queries')
  return listPendingSkills(user.id)
}

export async function assignPendingSkill(
  pendingSkillId: string,
  companionId: string,
  skillId: string,
  skillName: string,
) {
  void skillName
  const user = await getCurrentUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = assignPendingSkillSchema.safeParse({ pendingSkillId, companionId, skillId })
  if (!parsed.success) {
    return { error: 'Invalid upgrade assignment request' }
  }

  const { assignPendingSkillToCompanion } = await import('@/lib/queries')
  const result = await assignPendingSkillToCompanion(
    user.id,
    parsed.data.pendingSkillId,
    parsed.data.companionId,
    parsed.data.skillId,
  )
  if ('error' in result) return result

  return { success: true }
}

