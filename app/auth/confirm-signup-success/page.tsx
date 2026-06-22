import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { OperantLogo } from '@/components/operant-logo'

export default function ConfirmSignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <OperantLogo size={40} className="shadow-lg shadow-primary/30" />
          <span className="text-2xl font-bold font-sans tracking-tight text-foreground">Operant</span>
        </Link>

        <Card className="border-border/50 bg-card shadow-2xl">
          <CardHeader className="pb-2 pt-8">
            <div className="size-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Email confirmed!</h1>
          </CardHeader>
          <CardContent className="pb-2">
            <p className="text-muted-foreground leading-relaxed">
              Your account is ready. Sign in with your email and password to start buying and building AI agents.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 pb-8">
            <Button className="w-full" render={<Link href="/auth/login" />}>
              Go to Login
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground" render={<Link href="/" />}>
              Back to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
