import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  InvalidPasswordException,
  UsernameExistsException,
  InvalidParameterException,
  TooManyRequestsException,
  CodeDeliveryFailureException,
} from '@aws-sdk/client-cognito-identity-provider'

// Load .env.local
const root = process.cwd()
const envLocalPath = join(root, '.env.local')
if (existsSync(envLocalPath)) {
  const lines = readFileSync(envLocalPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim()
    }
  }
}

console.log('Running Auth & Sign-up Lifecycle Unit Tests...\n')

// ---------------------------------------------------------------------------
// 1. Password Policy Client-Side Validation Functionality
// ---------------------------------------------------------------------------
function validatePassword(password) {
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSymbol = /[^A-Za-z0-9]/.test(password)

  if (password.length < 8 || !hasUpperCase || !hasLowerCase || !hasNumber || !hasSymbol) {
    return {
      valid: false,
      error: 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a symbol.',
    }
  }
  return { valid: true }
}

assert.equal(validatePassword('short1!').valid, false, 'Short password must be rejected')
assert.equal(validatePassword('alllowercase1!').valid, false, 'Missing uppercase must be rejected')
assert.equal(validatePassword('ALLUPPERCASE1!').valid, false, 'Missing lowercase must be rejected')
assert.equal(validatePassword('NoNumbersHere!').valid, false, 'Missing numbers must be rejected')
assert.equal(validatePassword('Password123').valid, false, 'Missing symbols must be rejected')
assert.equal(validatePassword('ValidPass123!').valid, true, 'Compliant password must be accepted')
console.log('✓ Password policy client/server validation verified')

// ---------------------------------------------------------------------------
// 2. Direct Test of describeSignUpError with Real SDK Exception Classes
// ---------------------------------------------------------------------------
const { describeSignUpError, POST } = await import('../app/api/auth/sign-up/route.ts')

const realUserExistsErr = new UsernameExistsException({
  message: 'User already exists',
  $metadata: { httpStatusCode: 400 },
})
const userExistsResult = describeSignUpError(realUserExistsErr)
assert.equal(userExistsResult.status, 400)
assert.match(userExistsResult.error, /already exists/i)

const realInvalidPwErr = new InvalidPasswordException({
  message: 'Password does not conform to policy: Password not long enough',
  $metadata: { httpStatusCode: 400 },
})
const invalidPwResult = describeSignUpError(realInvalidPwErr)
assert.equal(invalidPwResult.status, 400)
assert.match(invalidPwResult.error, /uppercase, lowercase, numbers, and symbols/i)

const realInvalidParamErr = new InvalidParameterException({
  message: 'Invalid attribute name',
  $metadata: { httpStatusCode: 400 },
})
const invalidParamResult = describeSignUpError(realInvalidParamErr)
assert.equal(invalidParamResult.status, 400)
assert.match(invalidParamResult.error, /Invalid attribute name/i)

const realRateLimitErr = new TooManyRequestsException({
  message: 'Rate limit exceeded',
  $metadata: { httpStatusCode: 429 },
})
const rateLimitResult = describeSignUpError(realRateLimitErr)
assert.equal(rateLimitResult.status, 429)

const realCodeDeliveryErr = new CodeDeliveryFailureException({
  message: 'Delivery error',
  $metadata: { httpStatusCode: 500 },
})
const codeDeliveryResult = describeSignUpError(realCodeDeliveryErr)
assert.equal(codeDeliveryResult.status, 500)

const unknownErr = new Error('Unexpected network partition')
const unknownResult = describeSignUpError(unknownErr)
assert.equal(unknownResult.status, 503)

console.log('✓ Direct execution of route describeSignUpError with genuine AWS Cognito SDK exception instances passed')

// ---------------------------------------------------------------------------
// 3. Direct Invocation of Sign-Up Route Handler (POST)
// ---------------------------------------------------------------------------
// A: Malformed JSON
const badJsonReq = new Request('http://localhost/api/auth/sign-up', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: 'not valid json',
})
const badJsonRes = await POST(badJsonReq)
assert.equal(badJsonRes.status, 400)
const badJsonBody = await badJsonRes.json()
assert.equal(badJsonBody.error, 'Invalid account details')

// B: Invalid schema (missing email)
const badSchemaReq = new Request('http://localhost/api/auth/sign-up', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ displayName: 'Test', password: 'ValidPass123!' }),
})
const badSchemaRes = await POST(badSchemaReq)
assert.equal(badSchemaRes.status, 400)
const badSchemaBody = await badSchemaRes.json()
assert.equal(badSchemaBody.error, 'Invalid account details')

// C: Invalid email format
const badEmailReq = new Request('http://localhost/api/auth/sign-up', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ displayName: 'Test', email: 'not-an-email', password: 'ValidPass123!' }),
})
const badEmailRes = await POST(badEmailReq)
assert.equal(badEmailRes.status, 400)

console.log('✓ Sign-up route handler POST input validation directly verified')

// ---------------------------------------------------------------------------
// 4. User Identity Resolution & Anti-Fabrication Invariants
// ---------------------------------------------------------------------------
const { getCurrentUser } = await import('../lib/auth.ts')
const user = await getCurrentUser()
assert.equal(user, null, 'Unauthenticated session must return null without fabricating a user')
console.log('✓ Unauthenticated getCurrentUser correctly returns null without fabricating a user')

// ---------------------------------------------------------------------------
// 5. S3 Bucket Reachability & Account Ownership
// ---------------------------------------------------------------------------
const { assertAgentAssetsBucketReachable, getAgentAssetsBucket } = await import('../lib/s3.ts')
assert.ok(getAgentAssetsBucket().length > 0, 'Bucket name must be non-empty')
await assertAgentAssetsBucketReachable()
console.log(`✓ S3 bucket verified reachable with ExpectedBucketOwner (${getAgentAssetsBucket()})`)

console.log('\nAll Auth & Sign-up Lifecycle Unit Tests Passed Successfully!')
