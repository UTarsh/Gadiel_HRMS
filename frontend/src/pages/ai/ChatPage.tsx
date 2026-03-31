import { useState, useRef, useEffect } from 'react'
import { Loader2, Send, Sparkles } from 'lucide-react'
import { aiApi } from '@/api/ai'
import type { ChatMessage } from '@/api/ai'
import { useAuthStore } from '@/store/auth'
import { getInitials } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const QUICK_PROMPTS = [
  { icon: 'beach_access', label: 'Check my leave balance', q: 'How many leaves do I have left this year?' },
  { icon: 'fingerprint', label: 'Attendance summary', q: 'Give me a quick summary of how attendance tracking works in Gadiel HRMS.' },
  { icon: 'policy', label: 'Company leave policy', q: 'What is the leave policy at Gadiel Technologies?' },
  { icon: 'payments', label: 'Payroll questions', q: 'How is salary calculated at Gadiel Technologies?' },
  { icon: 'celebration', label: 'Office vibes', q: 'What makes Gadiel Technologies a great place to work?' },
  { icon: 'help', label: 'HRMS help', q: 'What can I do with this HRMS? Walk me through the features.' },
]

function MessageBubble({ msg, empName, avatarUrl }: { msg: ChatMessage; empName: string; avatarUrl?: string }) {
  const isUser = msg.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {isUser ? (
        <Avatar className="w-8 h-8 shrink-0 mt-0.5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="text-[10px] font-bold" style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)', color: '#fff' }}>
            {getInitials(empName)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)' }}>
          <span className="material-symbols-outlined text-white" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
        </div>
      )}

      {/* Bubble */}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed`}
        style={isUser
          ? { background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)', color: '#ffffff', borderBottomRightRadius: '6px' }
          : { backgroundColor: '#ffffff', color: '#1E293B', border: '1px solid #F1F5F9', borderBottomLeftRadius: '6px', boxShadow: '0 2px 8px rgba(30,41,59,0.06)' }
        }
      >
        {/* Format AI response — preserve line breaks */}
        {msg.content.split('\n').map((line, i) => (
          <span key={i}>
            {line}
            {i < msg.content.split('\n').length - 1 && <br />}
          </span>
        ))}
      </div>
    </div>
  )
}

export function ChatPage() {
  const { employee } = useAuthStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: ChatMessage = { role: 'user', content: trimmed }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const res = await aiApi.chat(next)
      const reply = res.data?.data?.reply ?? 'Hmm, I had trouble with that. Try again?'
      setMessages([...next, { role: 'assistant', content: reply }])
    } catch {
      setMessages([...next, { role: 'assistant', content: "Oops! Something went wrong. I'm having a moment — please try again." }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const avatarUrl = employee?.profile_picture_url || undefined

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-3xl mx-auto">

      {/* Page header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)' }}>
          <span className="material-symbols-outlined text-white" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
        </div>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1E293B' }}>
            Gadiel <span className="italic" style={{ color: '#3B82F6' }}>AI</span>
          </h1>
          <p className="text-xs" style={{ color: '#94A3B8' }}>Your HRMS assistant — ask anything about leaves, attendance, policies & more</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(59,130,246,0.08)' }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#3B82F6' }} />
          <span className="text-[10px] font-bold" style={{ color: '#3B82F6' }}>Powered by Groq</span>
        </div>
      </div>

      {/* Chat area */}
      <div className="card-kinetic flex-1 overflow-y-auto p-5 space-y-4" style={{ minHeight: 0 }}>
        {messages.length === 0 ? (
          /* Empty state — quick prompts */
          <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)' }}>
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div className="text-center">
              <p className="font-extrabold text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1E293B' }}>
                Hi {employee?.first_name ?? 'there'}! 👋
              </p>
              <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>I'm Gadiel AI. Ask me anything about your HRMS, policies, or company info!</p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => send(p.q)}
                  className="flex items-center gap-2.5 p-3 rounded-2xl text-left transition-all hover:scale-[1.02]"
                  style={{ backgroundColor: '#EFF6FF', border: '1px solid rgba(59,130,246,0.12)' }}
                >
                  <span className="material-symbols-outlined shrink-0" style={{ color: '#3B82F6', fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>{p.icon}</span>
                  <span className="text-xs font-semibold" style={{ color: '#1E293B' }}>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} empName={employee?.full_name ?? 'You'} avatarUrl={avatarUrl} />
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)' }}>
                  <span className="material-symbols-outlined text-white" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                </div>
                <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl" style={{ backgroundColor: '#ffffff', border: '1px solid #F1F5F9', borderBottomLeftRadius: '6px' }}>
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#3B82F6', animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#3B82F6', animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#3B82F6', animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input row */}
      <div className="mt-3 flex gap-2 items-end">
        <div className="flex-1 flex items-end gap-2 rounded-2xl px-4 py-3" style={{ backgroundColor: '#ffffff', border: '1.5px solid rgba(59,130,246,0.2)', boxShadow: '0 2px 12px rgba(59,130,246,0.06)' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask Gadiel AI anything… (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="flex-1 resize-none outline-none text-sm bg-transparent leading-relaxed"
            style={{ color: '#1E293B', maxHeight: '120px' }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 120) + 'px'
            }}
          />
        </div>
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all hover:scale-105 disabled:opacity-40 disabled:scale-100"
          style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)' }}
        >
          {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
        </button>
      </div>
      <p className="text-center text-[10px] mt-2" style={{ color: '#CBD5E1' }}>Shift+Enter for new line · AI can make mistakes — verify important info with HR</p>
    </div>
  )
}
