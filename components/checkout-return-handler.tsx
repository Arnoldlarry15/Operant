'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { fulfillOrder } from '@/lib/stripe-actions'

export function CheckoutReturnHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('checkout_session_id')
  const processedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!sessionId || processedRef.current === sessionId) return
    processedRef.current = sessionId

    async function handleReturn() {
      try {
        const result = await fulfillOrder(sessionId as string)
        if (!result?.success) {
          console.warn('[CheckoutReturnHandler] Return fulfillment result:', result?.error)
        }
      } catch (err) {
        console.error('[CheckoutReturnHandler] Fulfillment error:', err)
      } finally {
        router.refresh()
        router.replace('/')
      }
    }

    handleReturn()
  }, [sessionId, router])

  return null
}
