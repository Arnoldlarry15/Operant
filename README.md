# Operant

Operant is an AI agent store built with Next.js. Customers can buy prebuilt AI agents, build custom agents from modular parts, purchase upgrades, assign those upgrades to owned agents, and chat with their paid agents.

AWS Cognito is used for authentication only. Application data lives in Aurora PostgreSQL. Stripe handles checkout and payment webhooks. S3 stores private agent files, images, and generated assets. AWS Secrets Manager stores server-side configuration secrets. PostHog handles analytics, feature flags, error tracking, and product telemetry.

## What This App Does

- Sells prebuilt AI agents.
- Lets customers build custom AI agents.
- Sells paid upgrades and skills.
- Assigns purchased upgrades to owned agents.
- Provides an embedded support and guidance bot for customers.
- Provisions paid agents only after Stripe confirms payment.

There is no free companion product in the active scope.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Vercel deployment and serverless API routes
- AWS Cognito Auth
- AWS Aurora PostgreSQL Serverless v2
- AWS IAM
- AWS Secrets Manager
- AWS S3
- PostHog
- Stripe Checkout
- Vercel AI SDK

## Local Setup

Install dependencies:

```bash
npm install
```

Create local environment variables:

```bash
cp .env.example .env.local
```

Fill in the real values in `.env.local`, then check the account wiring:

```bash
npm run check:env
```

The check prints missing variable names only. It does not print secret values.

Do not put real secrets in `.env` or any tracked file. Use `.env.local` locally and Vercel Environment Variables in deployment.

Start the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Required Environment Variables

AWS Cognito Auth:

```text
COGNITO_USER_POOL_ID
COGNITO_USER_POOL_CLIENT_ID
```

If your Cognito app client has a client secret, also set:

```text
COGNITO_USER_POOL_CLIENT_SECRET
```

AWS Aurora PostgreSQL:

```text
PGHOST
PGDATABASE
PGUSER
PGSSLMODE
AWS_REGION
AWS_ROLE_ARN
```

AWS Secrets Manager:

```text
AWS_SECRETS_MANAGER_CONFIG_SECRET_ID
```

AWS S3:

```text
AGENT_ASSETS_BUCKET
```

PostHog:

```text
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST
```

Stripe:

```text
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

AI:

```text
AI_GATEWAY_API_KEY
```

On Vercel, `VERCEL_OIDC_TOKEN` can satisfy AI Gateway auth instead when your project is linked and AI Gateway is enabled.

App/admin:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SITE_URL
READINESS_TOKEN
SETUP_TOKEN
```

## AWS Cognito Setup

Create a Cognito User Pool and app client for Operant auth. The app client must allow username/password sign-in for the server route at:

```text
POST /api/auth/login
```

The app stores Cognito access, ID, and refresh tokens in httpOnly cookies. Server code refreshes expired access tokens, resolves the Cognito user, and ensures a matching Aurora `users` row before querying application data.

## AWS S3 Setup

Create a private bucket for agent files, images, and generated assets, then set:

```text
AGENT_ASSETS_BUCKET
```

Authenticated users can request short-lived upload URLs through:

```text
POST /api/assets/upload
```

## AWS Secrets Manager Setup

Create a text or JSON secret for server-side app configuration and set:

```text
AWS_SECRETS_MANAGER_CONFIG_SECRET_ID
```

The readiness endpoint verifies the configured secret can be read during operational checks.

## PostHog Setup

Set `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`. The app captures pageviews, identifies signed-in users, records server events, and reports client/server errors.

## Vercel Deployment

Yes, Vercel needs the same real environment variables too.

Local `.env.local` values are only for your machine. Add production values in:

```text
Vercel Project -> Settings -> Environment Variables
```

Set them for Production, and also Preview if you want preview deployments to use real services.

## Stripe Setup

Use Stripe Checkout for payments.

Required webhook endpoint:

```text
https://your-domain.com/api/webhooks/stripe
```

Subscribe to:

```text
checkout.session.completed
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
checkout.session.expired
payment_intent.payment_failed
charge.refunded
charge.dispute.created
```

Put the webhook signing secret in:

```text
STRIPE_WEBHOOK_SECRET
```

## Aurora Setup

Run the schema setup route after `SETUP_TOKEN` and Aurora env vars are configured:

```text
POST /api/db-setup
Authorization: Bearer YOUR_SETUP_TOKEN
```

The setup route also accepts `?token=...` for manual browser testing, but bearer auth is preferred so tokens are less likely to appear in logs. The setup route only allows approved migration files from `scripts/`.

## Readiness Check

The readiness endpoint is admin-only and protected by `READINESS_TOKEN`.

Configuration-only check:

```text
GET /api/readiness
Authorization: Bearer YOUR_READINESS_TOKEN
```

Operational check with Aurora, S3, and Secrets Manager checks:

```text
GET /api/readiness?mode=operational
Authorization: Bearer YOUR_READINESS_TOKEN
```

## Verification Commands

Run these before deploying:

```bash
npm run check:env
npm run verify:production
npm run lint
npm run build
```

`npm run check:env` is expected to fail until real local or shell environment variables are present.

## Important Product Boundaries

- Cognito is auth only.
- Aurora stores users, agents, orders, conversations, skills, milestones, and fulfillment state.
- S3 stores private agent files, images, and generated assets.
- Secrets Manager stores server-side configuration secrets.
- PostHog handles analytics, feature flags, error tracking, and product telemetry.
- Stripe is the source of payment confirmation.
- Paid agents are provisioned from server-side catalog data, not client-submitted prices.
- Customers do not download, install, or run purchased agents; they use them from the hosted dashboard.
- The embedded support bot is guidance only and is not a sellable agent.
