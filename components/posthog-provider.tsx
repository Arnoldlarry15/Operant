'use client'

import { Suspense, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { PostHogProvider as Provider } from 'posthog-js/react'
import { useAuth } from '@/components/auth-provider'

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST

const loadedPostHog = posthog as typeof posthog & { __loaded?: boolean }

if (typeof window !== 'undefined' && posthogKey && posthogHost && !loadedPostHog.__loaded) {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    capture_pageview: false,
    capture_pageleave: true,
    person_profiles: 'identified_only',
  })
}

function ProductTelemetry() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  useEffect(() => {
    if (!posthogKey || !posthogHost) return
    const url = `${window.location.origin}${pathname}${searchParams.size ? `?${searchParams}` : ''}`
    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])

  useEffect(() => {
    if (!posthogKey || !posthogHost) return
    if (user?.id) {
      posthog.identify(user.id, { email: user.email })
    } else {
      posthog.reset()
    }
  }, [user])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!posthogKey || !posthogHost) return <>{children}</>

  return (
    <Provider client={posthog}>
      {children}
      <Suspense fallback={null}>
        <ProductTelemetry />
      </Suspense>
    </Provider>
  )
}
