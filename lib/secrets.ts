import 'server-only'

import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager'
import { getAwsCredentials, getAwsRegion } from '@/lib/aws'

let secretsClient: SecretsManagerClient | null = null
const cache = new Map<string, string>()

function getSecretsClient(): SecretsManagerClient {
  secretsClient ??= new SecretsManagerClient({
    region: getAwsRegion(),
    credentials: getAwsCredentials(),
  })
  return secretsClient
}

export async function getSecretValue(secretId: string): Promise<string> {
  if (!secretId.trim()) throw new Error('secretId is required')
  const cached = cache.get(secretId)
  if (cached) return cached

  const result = await getSecretsClient().send(
    new GetSecretValueCommand({ SecretId: secretId }),
  )

  const value = result.SecretString ?? (
    result.SecretBinary ? Buffer.from(result.SecretBinary).toString('utf8') : null
  )

  if (!value) throw new Error(`Secret ${secretId} has no readable value`)
  cache.set(secretId, value)
  return value
}

export async function getJsonSecret<T extends Record<string, unknown>>(secretId: string): Promise<T> {
  return JSON.parse(await getSecretValue(secretId)) as T
}
