// app/page.tsx — BASE (before adding meetings feature)
'use client'

import { useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'

type Msg = { role: 'user' | 'assistant'; content: string }

type CalEvent = {
  id: string
  title: string
  start: string
  end: string
  location?: string
  htmlLink?: string
}

// 날짜/시간 보기 좋게 포맷
const fmt = (v: string) => {
  if (!v) return ''
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(v)
  if (isDateOnly) return v + ' (all-day)'
  try {
    return new Date(v).toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return v
  }
}

export default function Home() {
  const { data: session, status } = useSession()
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)

  // 데모 챗 요청
  const send = async () => {
    if (!input.trim()) return
    const next = [...messages, { role: 'user' as const, content: input }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: next[next.length - 1].content }),
      })
      const data = await res.json()
      setMessages([...next, { role: 'assistant', content: String(data.reply ?? '') }])
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Sorry, something went wrong.' }])
    } finally {
      setLoading(false)
    }
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') send()
  }

  // 다음 일정 n개
  const fetchEvents = async (n = 5) => {
    setLoadingEvents(true)
    try {
      const res = await fetch(`/api/calendar/next?n=${n}`)
      if (!res.ok) { alert('Please sign in with Google first.'); return }
      const data = await res.json()
      setEvents(Array.isArray(data.events) ? data.events : [])
    } catch {
      alert('Failed to fetch events.')
    } finally {
      setLoadingEvents(false)
    }
  }

  // 바로 다음 1개
  const fetchNextOne = () => fetchEvents(1)

  // 오늘 일정만
  const fetchToday = async () => {
    setLoadingEvents(true)
    try {
      const res = await fetch('/api/calendar/next?n=20')
      if (!res.ok) { alert('Please sign in with Google first.'); return }
      const data = await res.json()
      const all: CalEvent[] = Array.isArray(data.events) ? data.events : []
      const todayStr = new Date().toDateString()
      const today = all.filter((ev) => {
        const s = ev.start
        if (!s) return false
        const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(s)
        if (isDateOnly) {
          const d = new Date(s + 'T00:00:00')
          return d.toDateString() === todayStr
        }
        return new Date(s).toDateString() === todayStr
      })
      setEvents(today)
    } catch {
      alert("Failed to fetch today's events.")
    } finally {
      setLoadingEvents(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Everywhere AI</h1>

      {/* Auth & Calendar actions */}
      <div className="flex flex-wrap gap-2">
        {status !== 'authenticated' ? (
          <button onClick={() => signIn('google')} className="px-3 py-2 rounded-xl bg-black text-white">
            Sign in with Google
          </button>
        ) : (
          <button onClick={() => signOut()} className="px-3 py-2 rounded-xl bg-gray-200">
            Sign out
          </button>
        )}
        <button
          onClick={() => fetchEvents(5)}
          className="px-3 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-60"
          disabled={loadingEvents}
        >
          {loadingEvents ? 'Loading…' : 'Show next events'}
        </button>
        <button
          onClick={fetchNextOne}
          className="px-3 py-2 rounded-xl bg-indigo-600 text-white disabled:opacity-60"
          disabled={loadingEvents}
        >
          What’s next?
        </button>
        <button
          onClick={fetchToday}
          className="px-3 py-2 rounded-xl bg-teal-600 text-white disabled:opacity-60"
          disabled={loadingEvents}
        >
          Show today
        </button>
      </div>

      {/* Events list */}
      {events.length > 0 && (
        <ul className="space-y-2">
          {events.map((ev) => (
            <li key={ev.id} className="border rounded-xl p-3">
              <div className="font-medium">{ev.title}</div>
              <div className="text-sm text-gray-600">{fmt(ev.start)} → {fmt(ev.end)}</div>
              {ev.location && <div className="text-sm">{ev.location}</div>}
              {ev.htmlLink && (
                <a className="text-sm underline" href={ev.htmlLink} target="_blank" rel="noreferrer">
                  Open in Google Calendar
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Chat UI */}
      <div className="space-y-3">
        <div className="border rounded-xl p-3 h-96 overflow-y-auto bg-white/60">
          {messages.length === 0 && (
            <p className="text-gray-500">Try: &quot;What’s on my schedule today?&quot;</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`my-2 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
              <span className={`inline-block px-3 py-2 rounded-2xl ${m.role === 'user' ? 'bg-gray-200' : 'bg-gray-100'}`}>
                {m.content}
              </span>
            </div>
          ))}
          {loading && <p className="text-sm text-gray-400">Thinking…</p>}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-xl px-3 py-2"
            placeholder="Type your message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
          />
          <button onClick={send} className="px-4 py-2 rounded-xl bg-black text-white">Send</button>
        </div>
      </div>
    </div>
  )
}
