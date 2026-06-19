import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { createAgentAssetUploadUrl } from '@/lib/s3'
import { captureServerError, captureServerEvent } from '@/lib/posthog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const uploadRequestSchema = z.object({
  filename: z.string().min(1).max(160),
  contentType: z.enum([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/json',
    'text/plain',
    'application/zip',
  ]),
})

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = uploadRequestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid upload request' }, { status: 400 })
  }

  try {
    const ticket = await createAgentAssetUploadUrl({
      userId: user.id,
      filename: parsed.data.filename,
      contentType: parsed.data.contentType,
    })
    captureServerEvent(user.id, 'agent_asset_upload_ticket_created', {
      contentType: parsed.data.contentType,
    })
    return NextResponse.json(ticket)
  } catch (err) {
    captureServerError(user.id, err, { route: '/api/assets/upload' })
    console.error('[POST /api/assets/upload]', err)
    return NextResponse.json({ error: 'Could not create upload URL' }, { status: 500 })
  }
}
