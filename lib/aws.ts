import 'server-only'

import { awsCredentialsProvider } from '@vercel/functions/oidc'

export function getAwsRegion(): string {
  const region = process.env.AWS_REGION
  if (!region) throw new Error('AWS_REGION is not configured')
  return region
}

export function getAwsCredentials() {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {}),
    }
  }

  const roleArn = process.env.AWS_ROLE_ARN
  if (!roleArn) {
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local',
    }
  }

  return awsCredentialsProvider({
    roleArn,
    clientConfig: { region: getAwsRegion() },
  })
}
