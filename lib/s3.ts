import 'server-only'

import { DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getAwsCredentials, getAwsRegion } from '@/lib/aws'

let s3Client: S3Client | null = null

function getS3Client(): S3Client {
  s3Client ??= new S3Client({
    region: getAwsRegion(),
    credentials: getAwsCredentials(),
  })
  return s3Client
}

export function getAgentAssetsBucket(): string {
  const bucket = process.env.AGENT_ASSETS_BUCKET
  if (!bucket) throw new Error('AGENT_ASSETS_BUCKET is not configured')
  return bucket
}

function getExpectedBucketOwner(): string | undefined {
  return process.env.AWS_ACCOUNT_ID || undefined
}

export async function assertAgentAssetsBucketReachable(): Promise<void> {
  const bucket = getAgentAssetsBucket()
  try {
    await getS3Client().send(
      new HeadBucketCommand({
        Bucket: bucket,
        ExpectedBucketOwner: getExpectedBucketOwner(),
      }),
    )
  } catch (err: unknown) {
    const awsError = err as (Error & { $metadata?: { httpStatusCode?: number } }) | undefined
    const statusCode = awsError?.$metadata?.httpStatusCode
    const name = awsError?.name ?? 'UnknownError'
    if (statusCode === 404 || name === 'NotFound') {
      throw new Error(`S3 bucket '${bucket}' does not exist (HTTP 404).`)
    }
    if (statusCode === 403 || name === 'Forbidden') {
      throw new Error(`Access denied to S3 bucket '${bucket}' (HTTP 403). Check IAM permissions or AWS account ownership.`)
    }
    throw new Error(`S3 bucket '${bucket}' unreachable (${name}): ${awsError?.message ?? String(err)}`)
  }
}

export async function createAgentAssetUploadUrl(input: {
  userId: string
  filename: string
  contentType: string
  expiresInSeconds?: number
}): Promise<{ key: string; url: string; expiresInSeconds: number }> {
  const safeName = input.filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)

  if (!safeName) throw new Error('filename must include at least one safe character')

  const key = `users/${input.userId}/agent-assets/${crypto.randomUUID()}-${safeName}`
  const expiresInSeconds = input.expiresInSeconds ?? 300
  const command = new PutObjectCommand({
    Bucket: getAgentAssetsBucket(),
    Key: key,
    ContentType: input.contentType,
    ExpectedBucketOwner: getExpectedBucketOwner(),
  })

  return {
    key,
    expiresInSeconds,
    url: await getSignedUrl(getS3Client(), command, { expiresIn: expiresInSeconds }),
  }
}

export async function createAgentAssetDownloadUrl(
  key: string,
  expiresInSeconds = 300,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getAgentAssetsBucket(),
    Key: key,
    ExpectedBucketOwner: getExpectedBucketOwner(),
  })
  return getSignedUrl(getS3Client(), command, { expiresIn: expiresInSeconds })
}

export async function deleteAgentAsset(key: string): Promise<void> {
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: getAgentAssetsBucket(),
      Key: key,
      ExpectedBucketOwner: getExpectedBucketOwner(),
    }),
  )
}
