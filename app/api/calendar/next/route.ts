// app/api/calendar/next/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function GET(req: NextRequest) {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET // ✅ v5/호환
  const token = await getToken({ req, secret })
  if (!token || (!token.access_token && !token.refresh_token)) {
    return NextResponse.json({ error: 'Not signed in with Google' }, { status: 401 })
  }
  const accessToken = (token as any).access_token as string | undefined
  if (!accessToken) return NextResponse.json({ error: 'No access token' }, { status: 401 })

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
  const nowIso = new Date().toISOString()
  const n = Number(new URL(req.url).searchParams.get('n') ?? '5')
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('timeMin', nowIso)
  url.searchParams.set('maxResults', String(Math.min(Math.max(n, 1), 20)))
  url.searchParams.set('timeZone', 'Asia/Seoul')

  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, next: { revalidate: 0 } })
  const data = await res.json()
  if (!res.ok) return NextResponse.json({ error: data.error || 'Google API error' }, { status: 500 })

  const events = (data.items || []).map((ev: any) => ({
    id: ev.id, title: ev.summary || '(no title)',
    start: ev.start?.dateTime || ev.start?.date,
    end: ev.end?.dateTime || ev.end?.date,
    location: ev.location || '', htmlLink: ev.htmlLink,
  }))
  return NextResponse.json({ events })
}
