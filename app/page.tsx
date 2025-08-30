// app/page.tsx
'use client'
import { useState } from 'react'

type Msg = { role: 'user' | 'assistant'; content: string }

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const send = async () => {
    if (!input.trim()) return
    const next = [...messages, { role: 'user' as const, content: input }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ message: input }) })
      const data = await res.json()
      setMessages([...next, { role: 'assistant', content: data.reply }])
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: 'Sorry, something went wrong.' }])
    } finally {
      setLoading(false)
    }
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') send()
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Everywhere AI</h1>
      <div className="border rounded-xl p-3 h-96 overflow-y-auto bg-white/60">
        {messages.length === 0 && (
          <p className="text-gray-500">Try: "What’s on my schedule today?"</p>
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
  )
}