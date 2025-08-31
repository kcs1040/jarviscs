export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getToken } from 'next-auth/jwt'

export async function GET(req: NextRequest) {
  // 1) 세션에서 토큰 시도
  const session = await auth()
  let accessToken = session?.access_token as string | undefined

  // 2) 안 나오면 JWT에서 직접 읽기 (모든 v5 환경에서 가장 확실)
  if (!accessToken) {
    const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
    const jwt = await getToken({ req, secret })
    accessToken = (jwt as any)?.access_token as string | undefined
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'Not signed in with Google' }, { status: 401 })
  }

  const n = Number(new URL(req.url).searchParams.get('n') ?? '5')
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('timeMin', new Date().toISOString())
  url.searchParams.set('maxResults', String(Math.min(Math.max(n, 1), 20)))
  url.searchParams.set('timeZone', 'Asia/Seoul')

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 },
  })
  const data = await res.json()
  if (!res.ok) return NextResponse.json({ error: data.error || data }, { status: res.status })

  const events = (data.items || []).map((ev: any) => ({
    id: ev.id,
    title: ev.summary || '(no title)',
    start: ev.start?.dateTime || ev.start?.date,
    end: ev.end?.dateTime || ev.end?.date,
    location: ev.location || '',
    htmlLink: ev.htmlLink,
  }))
  return NextResponse.json({ events })
}
