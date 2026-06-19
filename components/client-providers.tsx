'use client'

import dynamic from 'next/dynamic'
import { PostHogProvider } from '@/components/posthog-provider'

const AuthProvider = dynamic(
  () => import('@/components/auth-provider').then((m) => m.AuthProvider),
  { ssr: false },
)

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PostHogProvider>{children}</PostHogProvider>
    </AuthProvider>
  )
}
