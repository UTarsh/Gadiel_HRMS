import { useEffect, useRef, useState } from 'react'
import { Loader2, RotateCcw, Send, Sparkles, X } from 'lucide-react'
import { aiApi } from '@/api/ai'

type Message = { role: 'user' | 'assistant'; content: string }
const FALLBACK_WEB_PROMPT = 'Unable to find what you are looking for, do you want me to look into the web?'
const INITIAL_MESSAGES: Message[] = [
  { role: 'assistant', content: 'Hi i am your gadiel buddy, how can i help you?' },
]

export function FloatingBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, open])

  async function sendText(rawText?: string) {
    const text = (rawText ?? input).trim()
    if (!text || loading) return
    const next = [...messages, { role: 'user' as const, content: text }]
    setMessages(next)
    if (!rawText) setInput('')
    setLoading(true)
    try {
      const res = await aiApi.chat(next)
      const reply = res.data?.data?.reply || 'I could not process that. Please try again.'
      setMessages([...next, { role: 'assistant', content: reply }])
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || ''
      const msg = detail.includes('AI service error')
        ? 'AI service is temporarily unavailable. Please try again in a moment.'
        : detail || 'Chat is currently unavailable. Make sure the backend server is running.'
      setMessages([...next, { role: 'assistant', content: msg }])
    } finally {
      setLoading(false)
    }
  }
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
  const showWebLookupButton = !!lastAssistant && lastAssistant.content.trim() === FALLBACK_WEB_PROMPT

  return (
    <>
      {open && (
        <div
          className="fixed z-50 bottom-24 right-4 md:right-7 w-[92vw] max-w-[360px] rounded-2xl overflow-hidden shadow-2xl"
          style={{ backgroundColor: 'var(--c-card)', border: '1px solid var(--c-border2)' }}
        >
          <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)', color: '#fff' }}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <p className="text-sm font-bold">Gadiel Buddy</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setMessages(INITIAL_MESSAGES); setInput('') }}
                title="Clear chat"
                className="opacity-80 hover:opacity-100 transition-opacity"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setOpen(false)}><X className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="h-72 overflow-y-auto p-3 space-y-2">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] rounded-xl px-3 py-2 text-xs whitespace-pre-wrap"
                  style={m.role === 'user'
                    ? { backgroundColor: '#2563EB', color: '#fff' }
                    : { backgroundColor: 'var(--c-surface)', color: 'var(--c-t1)' }}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-xl px-3 py-2 text-xs flex items-center gap-2" style={{ backgroundColor: 'var(--c-surface)', color: 'var(--c-t2)' }}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking...
                </div>
              </div>
            )}
            {showWebLookupButton && !loading && (
              <div className="flex justify-start">
                <button
                  onClick={() => sendText('yes')}
                  className="rounded-xl px-3 py-2 text-xs font-bold"
                  style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8' }}
                >
                  Yes, look into web
                </button>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="p-3 flex gap-2" style={{ borderTop: '1px solid var(--c-border3)' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendText() }}
              placeholder="Ask Gadiel Buddy..."
              className="flex-1 rounded-xl px-3 py-2 text-xs outline-none"
              style={{ backgroundColor: 'var(--c-surface)', color: 'var(--c-t1)', border: '1px solid var(--c-border2)' }}
            />
            <button onClick={() => sendText()} disabled={loading || !input.trim()} className="w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-50" style={{ backgroundColor: '#2563EB' }}>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed z-50 bottom-6 right-4 md:right-7 w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white transition-transform hover:scale-105"
        style={{ background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)' }}
        aria-label="Open bot"
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
      </button>
    </>
  )
}
