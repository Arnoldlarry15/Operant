import { awsCredentialsProvider } from '@vercel/functions/oidc'

process.env.AWS_REGION = 'us-east-2'
process.env.AWS_ROLE_ARN = 'arn:aws:iam::204429263609:role/vercel-operant-role'

async function test() {
  try {
    console.log('Calling awsCredentialsProvider...')
    const provider = awsCredentialsProvider({
      roleArn: process.env.AWS_ROLE_ARN,
      clientConfig: { region: process.env.AWS_REGION },
    })
    console.log('awsCredentialsProvider returned:', typeof provider)

    console.log('Now invoking returned provider function...')
    const creds = await provider()
    console.log('Creds resolved:', creds)
  } catch (err) {
    console.error('CATCHED ERROR AT INVOCATION TIME:', err)
  }
}

test()
