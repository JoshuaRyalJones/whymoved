import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // The plan named /dashboard, but the dashboard shipped at /demo in Task 14.
  return NextResponse.redirect(new URL('/demo', new URL(request.url).origin))
}
