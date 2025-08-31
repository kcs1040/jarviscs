// app/api/calendar/list/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  const accessToken = session?.access_token
  if (!accessToken) {
    return NextResponse.json({ error: 'Not signed in with Google' }, { status: 401 })
  }

  const listRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 },
  })
  const list = await listRes.json()
  if (!listRes.ok) {
    return NextResponse.json({ error: list.error || list }, { status: listRes.status })
  }

  const items = (list.items || []).map((c: any) => ({
    id: c.id,
    summary: c.summary,
    summaryOverride: c.summaryOverride,
  }))
  return NextResponse.json({ items })
}
