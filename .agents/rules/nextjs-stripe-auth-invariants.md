# Next.js Auth & Stripe Checkout Invariants

## 1. Cookie Security Scoping
- Never set `secure: true` on cookies during local HTTP development (`http://localhost:3000`).
- Always evaluate cookie security as `secure: Boolean(process.env.VERCEL && process.env.NODE_ENV === 'production')`.

## 2. Stripe Embedded Checkout Configuration
- Always use `ui_mode: 'embedded_page'` when invoking `stripe.checkout.sessions.create`.
- Pass `credentials: 'include'` when fetching client secrets from API route handlers (`/api/checkout/session`).

## 3. Resilient User Resolution
- `startCheckoutSession` must resolve authenticated users via cookies, fallback client email parameters, or guest account fallbacks (`guest-checkout@operant.local`) so checkout is never blocked by uninitialized session state.
