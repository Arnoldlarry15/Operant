import { query } from '@/lib/db'
import { assertAgentAssetsBucketReachable } from '@/lib/s3'
import { getSecretValue } from '@/lib/secrets'
import { getStripeConfig } from '@/lib/stripe-config'

type ReadinessCheck = {
  name: string
  ok: boolean
  detail?: string
  optional?: boolean
}

export type ReadinessReport = {
  ok: boolean
  checks: ReadinessCheck[]
}

export type OperationalProbes = {
  query?: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number }>
  assertBucketReachable?: () => Promise<void>
  getSecret?: (secretId: string) => Promise<string>
}

function hasEnv(name: string): boolean {
  return Boolean(process.env[name]?.trim())
}

function check(name: string, ok: boolean, detail?: string, optional?: boolean): ReadinessCheck {
  return { name, ok, detail, ...(optional ? { optional: true } : {}) }
}

export function getConfigurationReadiness(): ReadinessReport {
  let stripeOk = false
  let stripeDetail = 'Stripe is configured.'
  try {
    const stripeConfig = getStripeConfig()
    stripeOk = Boolean(stripeConfig.secretKey && stripeConfig.publishableKey && stripeConfig.webhookSecret)
    stripeDetail = `Stripe configured in ${stripeConfig.mode.toUpperCase()} mode.`
  } catch (err) {
    stripeOk = false
    stripeDetail = err instanceof Error ? err.message : 'Stripe configuration error.'
  }

  const checks: ReadinessCheck[] = [
    check('cognito_user_pool_id', hasEnv('COGNITO_USER_POOL_ID'), 'Required for AWS Cognito authentication.'),
    check('cognito_user_pool_client_id', hasEnv('COGNITO_USER_POOL_CLIENT_ID'), 'Required for AWS Cognito authentication.'),
    check('aurora_host', hasEnv('PGHOST'), 'Required for Aurora PostgreSQL.'),
    check('aurora_database', hasEnv('PGDATABASE'), 'Required for Aurora PostgreSQL.'),
    check('aurora_user', hasEnv('PGUSER'), 'Required for Aurora PostgreSQL.'),
    check('aurora_ssl_mode', hasEnv('PGSSLMODE'), 'Set to verify-full in production to verify the Aurora TLS certificate.'),
    check('aurora_aws_region', hasEnv('AWS_REGION'), 'Required for IAM database auth.'),
    check('aurora_aws_role', hasEnv('AWS_ROLE_ARN'), 'Required for Vercel OIDC to assume the RDS auth role.'),
    check('secrets_manager_config_secret', hasEnv('AWS_SECRETS_MANAGER_CONFIG_SECRET_ID'), 'Optional AWS Secrets Manager configuration access.', true),
    check('s3_agent_assets_bucket', hasEnv('AGENT_ASSETS_BUCKET'), 'Required for agent files, images, and assets in S3.'),
    check('posthog_key', hasEnv('NEXT_PUBLIC_POSTHOG_KEY'), 'Required for PostHog analytics, feature flags, errors, and telemetry.'),
    check('posthog_host', hasEnv('NEXT_PUBLIC_POSTHOG_HOST'), 'Required for PostHog ingestion.'),
    check('stripe_configuration', stripeOk, stripeDetail),
    check('ai_gateway_auth', hasEnv('AI_GATEWAY_API_KEY') || hasEnv('VERCEL_OIDC_TOKEN') || hasEnv('GOOGLE_GENERATIVE_AI_API_KEY') || hasEnv('GEMINI_API_KEY') || hasEnv('GROQ_API_KEY'), 'Required for AI Gateway, Gemini, or Groq chat generation.'),
    check('app_url', hasEnv('NEXT_PUBLIC_APP_URL') || hasEnv('NEXT_PUBLIC_SITE_URL'), 'Required for Stripe return URLs and auth redirects.'),
    check('readiness_token', hasEnv('READINESS_TOKEN'), 'Required to protect the readiness endpoint.'),
    check('setup_token', hasEnv('SETUP_TOKEN'), 'Required to protect the Aurora setup endpoint.'),
  ]

  return { ok: checks.every((item) => item.optional || item.ok), checks }
}

export async function getOperationalReadiness(probes?: OperationalProbes): Promise<ReadinessReport> {
  const configuration = getConfigurationReadiness()
  const checks = [...configuration.checks]
  const runQuery = probes?.query ?? query
  const runAssertBucket = probes?.assertBucketReachable ?? assertAgentAssetsBucketReachable
  const runGetSecret = probes?.getSecret ?? getSecretValue

  if (
    hasEnv('PGHOST') &&
    hasEnv('PGDATABASE') &&
    hasEnv('PGUSER') &&
    hasEnv('PGSSLMODE') &&
    hasEnv('AWS_REGION') &&
    hasEnv('AWS_ROLE_ARN')
  ) {
    try {
      await runQuery('SELECT 1')
      checks.push(check('aurora_connection', true, 'Aurora accepted a lightweight SELECT 1 query.'))
    } catch (err) {
      checks.push(check('aurora_connection', false, err instanceof Error ? err.message : String(err)))
    }
  } else {
    checks.push(check('aurora_connection', false, 'Skipped because Aurora environment variables are incomplete.'))
  }

  if (hasEnv('AGENT_ASSETS_BUCKET') && hasEnv('AWS_REGION') && hasEnv('AWS_ROLE_ARN')) {
    try {
      await runAssertBucket()
      checks.push(check('s3_agent_assets_bucket_access', true, 'S3 accepted a HeadBucket check.'))
    } catch (err) {
      checks.push(check('s3_agent_assets_bucket_access', false, err instanceof Error ? err.message : String(err)))
    }
  } else {
    checks.push(check('s3_agent_assets_bucket_access', false, 'Skipped because S3 environment variables are incomplete.'))
  }

  if (hasEnv('AWS_SECRETS_MANAGER_CONFIG_SECRET_ID') && hasEnv('AWS_REGION') && hasEnv('AWS_ROLE_ARN')) {
    const secretId = process.env.AWS_SECRETS_MANAGER_CONFIG_SECRET_ID!
    try {
      await runGetSecret(secretId)
      checks.push(check('secrets_manager_config_secret_access', true, 'Secrets Manager returned the configured secret.', true))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const isNotFound = message.includes('not found') || message.includes('ResourceNotFoundException')
      checks.push(
        check(
          'secrets_manager_config_secret_access',
          false,
          isNotFound
            ? `Optional secret '${secretId}' not found in Secrets Manager (non-blocking).`
            : `Optional Secrets Manager probe failed: ${message}`,
          true,
        ),
      )
    }
  } else {
    checks.push(check('secrets_manager_config_secret_access', false, 'Optional Secrets Manager check skipped (unconfigured).', true))
  }

  return { ok: checks.every((item) => item.optional || item.ok), checks }
}
