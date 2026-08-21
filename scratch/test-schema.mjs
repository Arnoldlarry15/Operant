import { z } from 'zod'

const checkoutItemSchema = z.object({
  id: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(160),
  price: z.number().finite().nonnegative().max(100_000),
  type: z.enum(['prebuilt', 'custom', 'shop']),
  companionMeta: z.object({
    companion_type: z.enum(['prebuilt', 'custom']).optional(),
    personality_id: z.string().trim().max(120).optional(),
    core_id: z.string().trim().max(120).optional(),
    appearance_id: z.string().trim().max(120).optional(),
    prebuilt_id: z.string().trim().max(120).optional(),
    skill_ids: z.array(z.string().trim().max(120)).max(25).optional(),
    color: z.string().trim().max(32).optional(),
    emoji: z.string().trim().max(16).optional(),
    trait: z.string().trim().max(500).optional(),
  }).passthrough().optional(),
}).passthrough()

const checkoutCartSchema = z.array(checkoutItemSchema).min(1).max(25)

const sampleCart = [
  {
    id: 'nexus',
    name: 'Nexus Prime',
    price: 29.99,
    type: 'prebuilt',
    companionMeta: {
      companion_type: 'prebuilt',
      prebuilt_id: 'nexus',
      color: '#22d3ee',
      emoji: 'AI',
      tagline: 'Hyper-intelligent assistant',
    },
  },
]

const result = checkoutCartSchema.safeParse(sampleCart)
console.log('Validation success?:', result.success)
if (!result.success) {
  console.log('Errors:', result.error.format())
}
