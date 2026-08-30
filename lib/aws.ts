import 'server-only'

import { awsCredentialsProvider } from '@vercel/functions/oidc'

export function getAwsRegion(): string {
  const region = process.env.AWS_REGION
  if (!region) throw new Error('AWS_REGION is not configured')
  return region
}

export function getAwsCredentials() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

  if (accessKeyId && secretAccessKey) {
    return {
      accessKeyId,
      secretAccessKey,
      ...(process.env.AWS_SESSION_TOKEN
        ? { sessionToken: process.env.AWS_SESSION_TOKEN }
        : {}),
    }
  }

  const roleArn = process.env.AWS_ROLE_ARN

  if (!roleArn) {
    throw new Error(
      'AWS credentials are not configured: set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY or AWS_ROLE_ARN for Vercel OIDC',
    )
  }

  return awsCredentialsProvider({
    roleArn,
    clientConfig: {
      region: getAwsRegion(),
    },
  })
}


