// app/api/calendar/list/route.ts
export const runtime = 'nodejs' // ✅ 쿠키/JWT 읽기용으로 Node 런타임 강제

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function GET(req: NextRequest) {
  // v5/호환 둘 다 지원
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET

  // ✅ 반드시 req를 넘겨야 쿠키에서 JWT를 읽습니다
  const token = await getToken({ req, secret })
  if (!token || !(token as any).access_token) {
    return NextResponse.json({ error: 'Not signed in with Google' }, { status: 401 })
  }

  const accessToken = (token as any).access_token as string
  const listRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 },
  })
  const list = await listRes.json()
  if (!listRes.ok) {
    // 에러 내용을 그대로 전달해서 디버그 쉬움
    return NextResponse.json({ error: list.error || list }, { status: listRes.status })
  }

  const items = (list.items || []).map((c: any) => ({
    id: c.id,
    summary: c.summary,
    summaryOverride: c.summaryOverride,
  }))

  return NextResponse.json({ items })
}
