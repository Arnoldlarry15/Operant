import 'server-only'

import { PostHog } from 'posthog-node'

let posthog: PostHog | null = null

export function isPostHogConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_POSTHOG_HOST)
}

export function getPostHogServerClient(): PostHog | null {
  if (!isPostHogConfigured()) return null

  posthog ??= new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  })

  return posthog
}

export function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): void {
  getPostHogServerClient()?.capture({ distinctId, event, properties })
}

export function captureServerError(
  distinctId: string,
  error: unknown,
  properties?: Record<string, unknown>,
): void {
  captureServerEvent(distinctId, 'server_error', {
    ...properties,
    message: error instanceof Error ? error.message : String(error),
  })
}
