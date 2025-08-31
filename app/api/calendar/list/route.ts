export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getToken } from 'next-auth/jwt'

export async function GET(req: NextRequest) {
  let accessToken = (await auth())?.access_token as string | undefined
  if (!accessToken) {
    const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
    const jwt = await getToken({ req, secret })
    accessToken = (jwt as any)?.access_token as string | undefined
  }
  if (!accessToken) {
    return NextResponse.json({ error: 'Not signed in with Google' }, { status: 401 })
  }

  const r = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 },
  })
  const j = await r.json()
  if (!r.ok) return NextResponse.json({ error: j.error || j }, { status: r.status })

  const items = (j.items || []).map((c: any) => ({
    id: c.id, summary: c.summary, summaryOverride: c.summaryOverride,
  }))
  return NextResponse.json({ items })
}
