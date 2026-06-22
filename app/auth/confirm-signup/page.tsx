"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { OperantLogo } from '@/components/operant-logo'

export default function ConfirmSignUpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam))
    }
  }, [searchParams])

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
      setError('Please enter a valid 6-digit code.')
      return
    }

    setLoading(true)
    setError(null)

    const response = await fetch('/api/auth/confirm-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    })

    setLoading(false)
    if (!response.ok) {
      const data = await response.json().catch(() => null)
      setError(data?.error ?? 'Could not confirm account. Please check your code and try again.')
      return
    }

    router.push(`/auth/confirm-signup-success?email=${encodeURIComponent(email)}`)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <OperantLogo size={40} className="shadow-lg shadow-primary/30" />
            <span className="text-2xl font-bold font-sans tracking-tight text-foreground">Operant</span>
          </Link>
          <p className="text-muted-foreground mt-2 text-sm">Your AI agent platform</p>
        </div>

        <Card className="border-border/50 bg-card shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold">Confirm your email</CardTitle>
            <CardDescription>
              Enter the 6-digit code we sent to {email}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleConfirm}>
            <CardContent className="flex flex-col gap-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="code">Confirmation code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Check your email for the 6-digit code. It may take a few seconds to arrive.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                {loading ? 'Confirming...' : 'Confirm Email'}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Wrong email?{' '}
                <Link href="/auth/sign-up" className="text-primary font-medium hover:underline">
                  Sign up again
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
