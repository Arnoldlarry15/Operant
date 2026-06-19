import 'server-only'

import { awsCredentialsProvider } from '@vercel/functions/oidc'

export function getAwsRegion(): string {
  const region = process.env.AWS_REGION
  if (!region) throw new Error('AWS_REGION is not configured')
  return region
}

export function getAwsCredentials() {
  const roleArn = process.env.AWS_ROLE_ARN
  if (!roleArn) throw new Error('AWS_ROLE_ARN is not configured')

  return awsCredentialsProvider({
    roleArn,
    clientConfig: { region: getAwsRegion() },
  })
}
