import { type NextRequest, NextResponse } from 'next/server'

const protectedPrefixes = ['/dashboard', '/companion', '/api/chat', '/api/companions', '/api/assets']
const publicApiPrefixes = ['/api/chat/support', '/api/auth', '/api/webhooks/stripe', '/api/readiness', '/api/db-setup']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublicApi = publicApiPrefixes.some((prefix) => pathname.startsWith(prefix))
  if (isPublicApi) return NextResponse.next()

  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix))
  if (!isProtected) return NextResponse.next()

  const hasSession = Boolean(request.cookies.get('operant_access_token')?.value)
  if (hasSession) return NextResponse.next()

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = request.nextUrl.clone()
  url.pathname = '/auth/login'
  url.searchParams.set('next', pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
