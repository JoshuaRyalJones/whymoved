import { NextResponse } from 'next/server'
import { Snaptrade, SnaptradeAuth } from 'snaptrade-typescript-sdk'
import { getServiceClient } from '~/lib/db/client'

function getSnaptrade() {
  const clientId = process.env.SNAPTRADE_CLIENT_ID
  const consumerKey = process.env.SNAPTRADE_CONSUMER_KEY
  if (!clientId || !consumerKey) throw new Error('SnapTrade credentials are not set')
  return new Snaptrade({ auth: SnaptradeAuth.commercialApiKey({ clientId, consumerKey }) })
}

export async function POST(request: Request) {
  const { userId } = (await request.json()) as { userId: string }
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

  const snaptrade = getSnaptrade()
  const db = getServiceClient()

  const registration = await snaptrade.authentication.registerSnapTradeUser({ userId })
  const userSecret = registration.data.userSecret
  if (!userSecret) {
    return NextResponse.json({ error: 'registration returned no userSecret' }, { status: 502 })
  }

  const { error } = await db.from('portfolio_sources').upsert({
    user_id: userId,
    kind: 'snaptrade',
    config: { userSecret },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const login = await snaptrade.authentication.loginSnapTradeUser({
    userId,
    userSecret,
    broker: 'WEALTHSIMPLETRADE',
    // Read-only is the default, but stating it makes the app-wide "never place a
    // trade" constraint structural rather than a matter of trusting the default.
    connectionType: 'read',
    immediateRedirect: true,
    customRedirect: `${new URL(request.url).origin}/api/snaptrade/callback`,
    connectionPortalVersion: 'v4',
  })

  return NextResponse.json({ redirectUri: (login.data as { redirectURI?: string }).redirectURI })
}
