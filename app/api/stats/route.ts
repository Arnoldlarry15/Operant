import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { skills } from '@/lib/store-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  let usersCount = 0
  let agentsBuiltCount = 0

  try {
    const res = await query<{ users_count: number; agents_count: number }>(`
      SELECT
        (SELECT COUNT(*)::INT
         FROM users
         WHERE email NOT LIKE '%@operant.invalid'
           AND email NOT LIKE '%@example.invalid'
           AND email NOT LIKE '%test%'
        ) AS users_count,
        (SELECT COUNT(*)::INT
         FROM companions
         INNER JOIN users ON companions.user_id = users.id
         WHERE companions.companion_type IN ('prebuilt', 'custom')
           AND users.email NOT LIKE '%@operant.invalid'
           AND users.email NOT LIKE '%@example.invalid'
           AND users.email NOT LIKE '%test%'
        ) AS agents_count
    `)
    if (res.rows?.[0]) {
      usersCount = Number(res.rows[0].users_count ?? 0)
      agentsBuiltCount = Number(res.rows[0].agents_count ?? 0)
    }
  } catch {
    // Graceful fallback to honest zero counts if database connection is unavailable
  }

  const response = NextResponse.json({
    users: usersCount,
    agentsBuilt: agentsBuiltCount,
    avgRating: null, // No user ratings mechanism in schema; honest representation is '--'
    skillsAvailable: skills.length, // Derived from canonical catalog
  })

  response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  return response
}
