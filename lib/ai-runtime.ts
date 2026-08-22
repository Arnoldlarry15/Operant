import 'server-only'
import { DEFAULT_AGENT_MODEL, GROQ_AGENT_MODEL } from '@/lib/agent-models'

const ALLOWED_MODELS = new Set([
  DEFAULT_AGENT_MODEL,
  GROQ_AGENT_MODEL,
  'google/gemini-2.5-pro',
  'google/gemini-1.5-flash',
  'google/gemini-1.5-pro',
])

const GATEWAY_MODEL_RE = /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9._-]*$/i

export function hasAiGatewayAuth(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY?.trim() ||
      process.env.VERCEL_OIDC_TOKEN?.trim() ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
      process.env.GEMINI_API_KEY?.trim() ||
      process.env.GROQ_API_KEY?.trim(),
  )
}

export function resolveAgentModel(model: string | null | undefined): string {
  const candidate = model?.trim()
  if (!candidate || !GATEWAY_MODEL_RE.test(candidate) || !ALLOWED_MODELS.has(candidate)) {
    return DEFAULT_AGENT_MODEL
  }
  return candidate
}

