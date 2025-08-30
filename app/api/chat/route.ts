// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'

function demoReply(message: string): string {
  const msg = message.toLowerCase()
  if (msg.includes('schedule') || msg.includes('일정') || msg.includes("what's on my")) {
    return 'Today: 10:00 Team Sync, 14:00 Design Review. (Demo data)'
  }
  if (msg.includes('help')) {
    return 'You can ask: "What’s on my schedule today?", "Save a note: I learned X", or "Search knowledge: entropy".'
  }
  if (msg.includes('note') || msg.includes('learned')) {
    return 'Noted. (In a later lesson, this will save to your notes.)'
  }
  return 'Hello! I am your starter assistant. After this lesson, I will connect to your real calendar and knowledge.'
}

export async function POST(req: NextRequest) {
  const { message } = await req.json()
  const reply = demoReply(String(message || ''))
  return NextResponse.json({ reply })
}