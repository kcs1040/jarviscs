// app/api/calendar/meetings/next-week/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

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
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET // ✅
  const token = await getToken({ req, secret })
  if (!token || (!token.access_token && !token.refresh_token)) {
    return NextResponse.json({ error: 'Not signed in with Google' }, { status: 401 })
  }
  const accessToken = (token as any).access_token as string | undefined
  if (!accessToken) return NextResponse.json({ error: 'No access token' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const calendarName = searchParams.get('calendar') || '업무_회의'
  const calendarIdParam = searchParams.get('calendarId') // 직접 ID로 요청도 허용

  // 1) 캘린더 ID 찾기
  let calId = calendarIdParam
  let calSummary: string | undefined
  if (!calId) {
    const listRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${accessToken}` }, next: { revalidate: 0 },
    })
    const list = await listRes.json()
    if (!listRes.ok) return NextResponse.json({ error: list.error || 'Failed to list calendars' }, { status: 500 })
    const items = Array.isArray(list.items) ? list.items : []
    const cal = items.find((c: any) => c.summary === calendarName || c.summaryOverride === calendarName)
    if (!cal) {
      const available = items.map((c: any) => c.summary || c.summaryOverride).filter(Boolean)
      return NextResponse.json({ error: `Calendar not found: ${calendarName}`, availableCalendars: available }, { status: 404 })
    }
    calId = cal.id; calSummary = cal.summary || cal.summaryOverride
  }

  // 2) 다음주 범위 조회
  const { startIso, endIso } = nextWeekRange()
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId!)}/events`)
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('timeMin', startIso)
  url.searchParams.set('timeMax', endIso)
  url.searchParams.set('maxResults', '50')
  url.searchParams.set('timeZone', 'Asia/Seoul')

  const evRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, next: { revalidate: 0 } })
  const data = await evRes.json()
  if (!evRes.ok) return NextResponse.json({ error: data.error || 'Google API error' }, { status: 500 })

  const events = (data.items || []).map((ev: any) => ({
    id: ev.id, title: ev.summary || '(no title)',
    start: ev.start?.dateTime || ev.start?.date,
    end: ev.end?.dateTime || ev.end?.date,
    location: ev.location || '', htmlLink: ev.htmlLink,
  }))

  return NextResponse.json({
    calendarId: calId, calendarSummary: calSummary ?? calendarName,
    range: { start: startIso, end: endIso },
    events,
  })
}
