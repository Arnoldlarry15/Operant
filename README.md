# Operant

Operant is a production-grade autonomous AI agent storefront and runtime platform built with Next.js 16, TypeScript, AWS, and Stripe. Customers can purchase specialized prebuilt AI agents, engineer custom agents from modular cognitive components, purchase shop skill upgrades, assign those capabilities to their owned agents, and interact with their agents in real-time.

---

## Architecture & System Overview

Operant enforces strict domain separation across its cloud services and runtime architecture:

- **Frontend & App Server:** Next.js 16 App Router, Turbopack, React 19, Tailwind CSS, Lucide icons, Framer Motion, and Base UI components.
- **Authentication:** AWS Cognito handles user identity, password policies, and authentication sessions via secure, httpOnly cookies (`operant_access`, `operant_id`, `operant_refresh`). Cognito handles auth only; application profile data lives in PostgreSQL.
- **Primary Database:** AWS Aurora PostgreSQL Serverless v2 running with connection pooling (`pg.Pool`), transaction isolation, and least-privilege database roles (`operant_app`). Tables include `users`, `companions`, `conversations`, `companion_skills`, `orders`, `pending_skills`, `rate_limits`, and `archived_free_agents`.
- **Payment & Fulfillment:** Stripe Checkout and secure Webhooks (`/api/webhooks/stripe`). Fulfillment occurs exclusively on verified Stripe webhook events (`checkout.session.completed`, `checkout.session.async_payment_succeeded`) using idempotency keys, atomic transactions, and server-side pricing verification.
- **AI Runtimes:** Anthropic Claude models orchestrated via the Vercel AI SDK (`@ai-sdk/react`, `ai`), providing streaming companion conversations and tool-driven intelligence.
- **Cloud Assets & Security:** AWS S3 for private agent file storage and presigned asset uploads; AWS Secrets Manager for encrypted server configuration; PostHog for telemetry, analytics, and error tracking.

---

## Authoritative Agent & Product Catalog

### 1. Prebuilt Agents

Operant offers five specialized, production-ready prebuilt agents. Each agent comes pre-equipped with five bundled skills:

| Agent | Tagline | Price | Bundled Skills |
| :--- | :--- | :--- | :--- |
| **ECHO** | The Creative Spirit | $49 | Image Creator, Social Manager, Email Writer, Web Search, Voice Mode |
| **BLAZE** | The Performance Coach | $59 | Fitness Coach, Calendar Manager, Email Writer, Finance Tracker, Social Manager |
| **SAGE** | The Wise Mentor | $79 | Deep Research, Language Tutor, Web Search, Data Analyst, Email Writer |
| **NOVA** | The Ultimate Analyst | $89 | Web Search, Deep Research, Data Analyst, Code Assistant, Calendar Manager |
| **TITAN** | The Loyal Guardian | $129 | Email Writer, Finance Tracker, Calendar Manager, Code Assistant, Data Analyst |

### 2. Custom Agent Studio

Customers can configure custom autonomous agents through the interactive Agent Builder:
- **Personalities:**
  - *Analytical* (The Analyst) – $15
  - *Energetic* (The Motivator) – $15
  - *Creative* (The Visionary) – $15
  - *Empathetic* (The Empath) – $15
  - *Strategic* (The Mastermind) – $25
  - *Adaptive* (The Chameleon) – $25
- **Core Architectures:**
  - *Balanced Core* – $19
  - *Speed Core* – $29
  - *Power Core* – $39
  - *Quantum Core* – $59
- **Visual Appearances / Themes:**
  - *Pulse* (Neon Cyan) – $9
  - *Ember* (Ember Gold) – $9
  - *Phantom* (Phantom Dark) – $15
  - *Aurora* (Aurora Shift) – $19
- **Selectable Skills:** Choose any combination from the 12 primary skills.
- **Dynamic Pricing:** Base price is determined by the chosen personality, core, and appearance, plus the sum of selected skills.

### 3. Primary Skills Catalog (12 Base Skills)

The 12 core skills available for agents and custom configurations:

- `Web Search` ($9) – Search planning, source summaries, and current-info workflows.
- `Calendar Manager` ($9) – Turn priorities into agendas, time blocks, and reminder plans.
- `Email Writer` ($9) – Draft, summarize, and polish emails in the right tone.
- `Language Tutor` ($12) – Practice vocabulary, grammar, pronunciation, and short exercises.
- `Fitness Coach` ($12) – Build practical workouts, habits, and progress plans.
- `Code Assistant` ($19) – Write, debug, and explain code across common languages.
- `Finance Tracker` ($19) – Plan budgets, categorize spending, and explain tradeoffs.
- `Social Manager` ($19) – Plan, write, and repurpose social media content.
- `Image Creator` ($25) – Create prompts, art direction, visual briefs, and variants.
- `Voice Mode` ($25) – Write scripts, voice flows, and audio-ready responses.
- `Deep Research` ($29) – Produce structured reports, evidence tables, and summaries.
- `Data Analyst` ($29) – Analyze datasets, assumptions, and decision-ready findings.

### 4. Shop Upgrades & Add-ons (37 Catalog Items)

Customers can browse and purchase 37 individual upgrades and add-ons across 5 categories to enhance existing agents:
- **Skills (9 items):** Operator Mode ($19), Workflow Planner ($29), Calm Coach ($12), Meal Planner ($12), Meeting Briefs ($19), Sales Assistant ($19), Study Coach ($12), HR Helper ($19), Travel Planner ($12).
- **Upgrades (8 items):** Memory Vault ($19), Deep Work Mode ($49), Personality Reset ($12), Priority Responses ($19), Team Handoff Pack ($29), Long Context Pack ($29), Proactive Questions ($12), Executive Summary Mode ($19).
- **Appearances (7 items):** Neon Interface ($9 / on sale $7), Galaxy Theme ($12 / on sale $9), Executive Theme ($12), Studio Theme ($9), Aurora Theme ($19), Minimal Theme ($9), Solar Theme ($12).
- **Accessories (6 items):** Privacy Shield ($19), Citation Pack ($12), Brand Voice Pack ($19), Decision Matrix Pack ($19), Client-Ready Pack ($29), Compliance Reminder Pack ($29).
- **Tools (7 items):** Video Analyzer ($25), Market Watcher ($19), Document Reviewer ($19), Spreadsheet Helper ($19), Prompt Builder ($12), Contract Helper ($29), CSV Cleaner ($12).

---

## Landing Page Statistics Ticker

The storefront features an honest, live-updating statistics ticker powered by `/api/stats`:

1. **Active Users:** Real-time count of registered account holders in the Aurora `users` table. Internal test fixtures (`@operant.invalid`, `@example.invalid`, and test patterns) are explicitly filtered out.
2. **Agents Built:** Real-time count of deployed companion agents across all non-test customer accounts.
3. **Skills Available:** Derived directly from the canonical store catalog (12 primary skills).
4. **Average Rating:** Displays `--` honestly until an official customer review and rating collection mechanism is deployed. Operant never fabricates artificial social proof or placeholder ratings.
5. **Caching & Performance:** Responses include HTTP header `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` to optimize edge caching while ensuring data freshness.

---

## Stripe Dual-Mode Configuration

Operant supports seamless operation across Stripe test and live environments via environment configuration:

- **Mode Switching:** Controlled by `STRIPE_MODE=test` (default for dev/staging/preview) or `STRIPE_MODE=live` (production).
- **Environment Invariants:** In production environments (`VERCEL_ENV=production`), live Stripe keys (`sk_live_...`, `pk_live_...`) are enforced unless explicitly configured.
- **Webhooks:** The `/api/webhooks/stripe` endpoint validates signatures using `STRIPE_WEBHOOK_SECRET` before processing.
- **Supported Events:**
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.async_payment_failed`
  - `checkout.session.expired`
  - `payment_intent.payment_failed`
  - `charge.refunded`
  - `charge.dispute.created`

---

## Local Development & Setup

### 1. Prerequisites
- Node.js 20+ (recommended Node 24)
- npm 10+
- An AWS Aurora PostgreSQL instance or local PostgreSQL 15+
- An AWS Cognito User Pool

### 2. Installation
```bash
git clone https://github.com/Arnoldlarry15/Operant.git
cd Operant
npm install
```

### 3. Environment Configuration
```bash
cp .env.example .env.local
```
Fill in `.env.local` with your database, Cognito, and Stripe credentials. Never commit `.env.local` to git.

Verify your environment configuration:
```bash
npm run check:env
```

### 4. Start Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000`.

---

## Required Environment Variables

| Variable | Description |
| :--- | :--- |
| `PGHOST` | Aurora / PostgreSQL host |
| `PGDATABASE` | PostgreSQL database name (e.g. `operant`) |
| `PGUSER` | Database username |
| `PGPASSWORD` | Database password |
| `PGPORT` | Database port (default: 5432) |
| `PGSSLMODE` | SSL mode (`require` for AWS Aurora) |
| `COGNITO_USER_POOL_ID` | AWS Cognito User Pool ID |
| `COGNITO_USER_POOL_CLIENT_ID` | AWS Cognito App Client ID |
| `COGNITO_USER_POOL_CLIENT_SECRET` | Optional Cognito client secret |
| `STRIPE_MODE` | `test` or `live` |
| `STRIPE_SECRET_KEY` | Stripe API Secret Key (`sk_test_...` or `sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook Secret (`whsec_...`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Publishable Key (`pk_test_...` or `pk_live_...`) |
| `AGENT_ASSETS_BUCKET` | AWS S3 Bucket for private asset storage |
| `AI_GATEWAY_API_KEY` | Vercel AI SDK / Anthropic API Gateway key |
| `READINESS_TOKEN` | Bearer token for protected readiness probes |
| `SETUP_TOKEN` | Bearer token for running database schema migrations |
| `NEXT_PUBLIC_APP_URL` | Application root URL (e.g. `https://operantai.xyz`) |

---

## Test & Verification Suite

Operant includes an automated verification suite covering configuration, payments, and API routes:

```bash
# 1. Full TypeScript compilation and Next.js Turbopack build
npm run build

# 2. Stripe dual-mode configuration validation
npm run test:stripe-config

# 3. Unit test Stripe webhook signatures and payload handling
npm run test:webhook

# 4. Validate isolated checkout sandbox flow
npm run test:checkout

# 5. Production deployment invariants verification
npm run verify:production

# 6. Verify honest statistics endpoint logic
node --loader ./scratch/test-loader.mjs scripts/test-stats.mjs

# 7. Code quality and ESLint rules
npm run lint
```

---

## Production Deployment & Operational Readiness

### Vercel Deployment
Deploying to Vercel requires configuring the project environment variables in `Settings -> Environment Variables`. Production deployments trigger automatically via GitHub releases or direct Vercel CLI:
```bash
npx vercel --prod
```

### Operational Readiness Check
The `/api/readiness` endpoint provides admin-level health diagnostics:
```bash
# Configuration-only diagnostic
curl -H "Authorization: Bearer YOUR_READINESS_TOKEN" https://operantai.xyz/api/readiness

# Full operational diagnostic (verifies Aurora pool, S3 bucket, Secrets Manager)
curl -H "Authorization: Bearer YOUR_READINESS_TOKEN" "https://operantai.xyz/api/readiness?mode=operational"
```

---

## Product Boundaries & Known Limitations

- **Commercial Paid Runtimes:** Operant specializes in paid autonomous agents. There is no free companion tier; agents are provisioned upon confirmed Stripe payment.
- **Hosted Agent Execution:** Purchased agents are managed and interacted with through the hosted Operant platform; customers do not download or run agent binaries locally.
- **Embedded Support Bot:** The on-site customer support assistant provides product guidance only and is not a sellable agent.
- **Stripe Live Charging:** Live transactions require valid payment methods and live Stripe keys. Development and automated integration tests run against isolated test databases (`operant_test`) and Stripe test mode.
- **Customer Ratings:** The ratings ticker displays `--` until an authentic customer review collection system is implemented.

---

## License

Operant is licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for the full license text.

Copyright &copy; 2026 Larry Arnold and Operant contributors.
