import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const envLocalPath = join(root, '.env.local')

if (existsSync(envLocalPath)) {
  const lines = readFileSync(envLocalPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim()
    }
  }
}

// Ensure base environment variables are present for test execution
process.env.STRIPE_MODE = 'test'
process.env.PGHOST = process.env.PGHOST || 'operant-db-1.cluster-czc424488v7p.us-east-2.rds.amazonaws.com'
process.env.PGDATABASE = process.env.PGDATABASE || 'postgres'
process.env.PGUSER = process.env.PGUSER || 'postgres'
process.env.PGSSLMODE = process.env.PGSSLMODE || 'verify-full'
process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-2'
process.env.AWS_ROLE_ARN = process.env.AWS_ROLE_ARN || 'arn:aws:iam::204429263609:role/vercel-operant-role'
process.env.AGENT_ASSETS_BUCKET = process.env.AGENT_ASSETS_BUCKET || 'operant-agent-assets-204429263609-us-east-2-an'
process.env.AWS_SECRETS_MANAGER_CONFIG_SECRET_ID = process.env.AWS_SECRETS_MANAGER_CONFIG_SECRET_ID || 'operant/production/app-config'

const { getConfigurationReadiness, getOperationalReadiness } = await import('../lib/readiness.ts')

console.log('Running Operational Readiness Unit Tests...\n')

// 1. Configuration readiness baseline
{
  const report = getConfigurationReadiness()
  assert.equal(report.ok, true, 'Configuration readiness should succeed with complete env')
  const smCheck = report.checks.find((c) => c.name === 'secrets_manager_config_secret')
  assert.ok(smCheck, 'secrets_manager_config_secret check exists')
  assert.equal(smCheck.optional, true, 'secrets_manager_config_secret is marked optional')
  console.log('✓ Configuration readiness passes and marks Secrets Manager check optional')
}

// 2. Operational readiness: Missing optional secret does NOT fail readiness
{
  const report = await getOperationalReadiness({
    query: async () => ({ rows: [{ '?column?': 1 }], rowCount: 1 }),
    assertBucketReachable: async () => {},
    getSecret: async () => {
      const err = new Error("Secret 'operant/production/app-config' not found in Secrets Manager.")
      err.name = 'ResourceNotFoundException'
      throw err
    },
  })

  assert.equal(report.ok, true, 'Overall readiness must be true when only an optional secret is absent')

  const aurora = report.checks.find((c) => c.name === 'aurora_connection')
  assert.equal(aurora?.ok, true, 'Aurora connection check passed')
  assert.equal(aurora?.optional, undefined, 'Aurora connection is required (not optional)')

  const s3 = report.checks.find((c) => c.name === 's3_agent_assets_bucket_access')
  assert.equal(s3?.ok, true, 'S3 bucket access check passed')
  assert.equal(s3?.optional, undefined, 'S3 bucket access is required (not optional)')

  const sm = report.checks.find((c) => c.name === 'secrets_manager_config_secret_access')
  assert.equal(sm?.ok, false, 'Secrets manager check is recorded as not ok (not found)')
  assert.equal(sm?.optional, true, 'Secrets manager check is marked optional')
  assert.match(sm?.detail || '', /Optional secret .* not found in Secrets Manager \(non-blocking\)/)

  console.log('✓ Operational readiness passes with 200/ok:true when optional secret is absent')
}

// 3. Operational readiness: Failed Aurora query MUST fail overall readiness
{
  const report = await getOperationalReadiness({
    query: async () => {
      throw new Error('Connection timeout connecting to PostgreSQL after 30000ms')
    },
    assertBucketReachable: async () => {},
    getSecret: async () => {
      const err = new Error("Secret 'operant/production/app-config' not found in Secrets Manager.")
      err.name = 'ResourceNotFoundException'
      throw err
    },
  })

  assert.equal(report.ok, false, 'Overall readiness must be false when required Aurora query fails')
  const aurora = report.checks.find((c) => c.name === 'aurora_connection')
  assert.equal(aurora?.ok, false, 'Aurora check is marked failed')
  assert.match(aurora?.detail || '', /Connection timeout/)

  console.log('✓ Operational readiness strictly fails when required Aurora query fails')
}

// 4. Operational readiness: Failed S3 bucket access MUST fail overall readiness
{
  const report = await getOperationalReadiness({
    query: async () => ({ rows: [{ '?column?': 1 }], rowCount: 1 }),
    assertBucketReachable: async () => {
      throw new Error('AccessDenied: User is not authorized to perform: s3:ListBucket')
    },
    getSecret: async () => {
      const err = new Error("Secret 'operant/production/app-config' not found in Secrets Manager.")
      err.name = 'ResourceNotFoundException'
      throw err
    },
  })

  assert.equal(report.ok, false, 'Overall readiness must be false when required S3 check fails')
  const s3 = report.checks.find((c) => c.name === 's3_agent_assets_bucket_access')
  assert.equal(s3?.ok, false, 'S3 check is marked failed')
  assert.match(s3?.detail || '', /AccessDenied/)

  console.log('✓ Operational readiness strictly fails when required S3 check fails')
}

// 5. Operational readiness: All operational probes pass
{
  const report = await getOperationalReadiness({
    query: async () => ({ rows: [{ '?column?': 1 }], rowCount: 1 }),
    assertBucketReachable: async () => {},
    getSecret: async () => '{"app":"operant"}',
  })

  assert.equal(report.ok, true, 'Overall readiness is true when all checks pass')
  const sm = report.checks.find((c) => c.name === 'secrets_manager_config_secret_access')
  assert.equal(sm?.ok, true, 'Secrets manager check succeeded')
  assert.equal(sm?.optional, true, 'Secrets manager check is optional')

  console.log('✓ Operational readiness passes when all probes (including Secrets Manager) pass')
}

console.log('\nAll Readiness Unit Tests Passed!\n')
