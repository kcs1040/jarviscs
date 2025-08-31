// app/api/calendar/meetings/next-week/route.ts
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

function nextWeekRange() {
  const now = new Date()
  const dow = now.getDay() // 0=Sun
  let addDays = (8 - dow) % 7
  if (addDays === 0) addDays = 7
  const start = new Date(now); start.setHours(0,0,0,0); start.setDate(start.getDate() + addDays)
  const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999)
  return { startIso: start.toISOString(), endIso: end.toISOString() }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  const accessToken = session?.access_token
  if (!accessToken) {
    return NextResponse.json({ error: 'Not signed in with Google' }, { status: 401 })
    }

  const { searchParams } = new URL(req.url)
  const calendarIdParam = searchParams.get('calendarId')
  const calendarName = searchParams.get('calendar') || '업무_회의'
  let calId = calendarIdParam as string | null

  // ID가 없으면 이름으로 탐색
  if (!calId) {
    const listRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 0 },
    })
    const list = await listRes.json()
    if (!listRes.ok) {
      return NextResponse.json({ error: list.error || list }, { status: listRes.status })
    }
    const items = Array.isArray(list.items) ? list.items : []
    const cal = items.find(
      (c: any) => c.summary === calendarName || c.summaryOverride === calendarName
    )
    if (!cal) {
      const available = items.map((c: any) => c.summary || c.summaryOverride).filter(Boolean)
      return NextResponse.json(
        { error: `Calendar not found: ${calendarName}`, availableCalendars: available },
        { status: 404 }
      )
    }
    calId = cal.id
  }

  const { startIso, endIso } = nextWeekRange()
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId!)}/events`)
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('timeMin', startIso)
  url.searchParams.set('timeMax', endIso)
  url.searchParams.set('maxResults', '50')
  url.searchParams.set('timeZone', 'Asia/Seoul')

  const evRes = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 },
  })
  const data = await evRes.json()
  if (!evRes.ok) {
    return NextResponse.json({ error: data.error || data }, { status: evRes.status })
  }

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
