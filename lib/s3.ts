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

export async function assertAgentAssetsBucketReachable(): Promise<void> {
  await getS3Client().send(new HeadBucketCommand({ Bucket: getAgentAssetsBucket() }))
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
  const command = new GetObjectCommand({ Bucket: getAgentAssetsBucket(), Key: key })
  return getSignedUrl(getS3Client(), command, { expiresIn: expiresInSeconds })
}

export async function deleteAgentAsset(key: string): Promise<void> {
  await getS3Client().send(new DeleteObjectCommand({ Bucket: getAgentAssetsBucket(), Key: key }))
}
