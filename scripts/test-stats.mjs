import assert from 'node:assert/strict'
import { skills } from '../lib/store-data.ts'
import { GET } from '../app/api/stats/route.ts'

console.log('============================================================')
console.log('TEST: PUBLIC STATISTICS ENDPOINT (/api/stats)')
console.log('============================================================\n')

// 1. Invoke GET handler directly
const response = await GET()
assert.equal(response.status, 200, 'GET /api/stats must return HTTP 200')

const data = await response.json()
console.log('Response payload:', data)

// 2. Validate response structure
assert.ok('users' in data, 'Must include users count')
assert.ok('agentsBuilt' in data, 'Must include agentsBuilt count')
assert.ok('avgRating' in data, 'Must include avgRating')
assert.ok('skillsAvailable' in data, 'Must include skillsAvailable')

// 3. Validate honesty rules
assert.equal(typeof data.users, 'number', 'users must be a number')
assert.ok(data.users >= 0, 'users must be non-negative')

assert.equal(typeof data.agentsBuilt, 'number', 'agentsBuilt must be a number')
assert.ok(data.agentsBuilt >= 0, 'agentsBuilt must be non-negative')

// avgRating must be null (no artificial rating manufactured)
assert.equal(data.avgRating, null, 'avgRating must be null until real reviews exist')

// skillsAvailable must be derived from canonical catalog
assert.equal(data.skillsAvailable, skills.length, `skillsAvailable must match catalog (${skills.length})`)

// 4. Validate cache headers
const cacheControl = response.headers.get('cache-control')
assert.ok(cacheControl?.includes('s-maxage=60'), 'Cache-Control header must be set')
console.log('✓ Cache-Control header verified:', cacheControl)

console.log('\n✓ All /api/stats endpoint assertions passed successfully!\n')
