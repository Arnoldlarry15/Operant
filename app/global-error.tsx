"use client"

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html>
      <body style={{ background: '#0a0a0f', color: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}>
          <div style={{
            maxWidth: '420px',
            width: '100%',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'oklch(0.55 0.2 25 / 15%)',
              border: '1px solid oklch(0.55 0.2 25 / 30%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <AlertTriangle size={24} color="oklch(0.7 0.2 25)" />
            </div>

            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
                Something went wrong
              </h1>
              <p style={{ fontSize: '0.875rem', color: 'oklch(0.55 0.02 260)', margin: 0, lineHeight: 1.6 }}>
                An unexpected error occurred. Your data is safe -- this is just a hiccup.
              </p>
            </div>

            {error.digest && (
              <code style={{
                fontSize: '0.7rem',
                color: 'oklch(0.4 0.02 260)',
                background: 'oklch(0.12 0.01 260)',
                padding: '0.25rem 0.75rem',
                borderRadius: '6px',
              }}>
                Error ID: {error.digest}
              </code>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button
                onClick={reset}
                className="gap-2"
                style={{ background: 'oklch(0.75 0.18 195)', color: '#000', fontWeight: 600 }}
              >
                <RotateCcw size={14} />
                Try again
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
              >
                Go home
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
