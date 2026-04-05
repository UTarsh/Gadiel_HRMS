import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth'

type Step = 'signin' | 'email' | 'setup'

const SERVICES = [
  { icon: '💻', label: 'IT & Automation' },
  { icon: '☁️', label: 'Cloud' },
  { icon: '🌐', label: 'Networking' },
  { icon: '🔒', label: 'Security' },
  { icon: '⚙️', label: 'Managed Services' },
  { icon: '🎓', label: 'Training' },
]

const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '13px 48px 13px 16px',
  backgroundColor: '#F8FAFC',
  border: '1.5px solid #E2E8F0',
  borderRadius: '12px',
  fontSize: '15px',
  color: '#1E293B',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s, background-color 0.15s',
  fontFamily: "'Be Vietnam Pro', sans-serif",
}

function Field({
  label, type, placeholder, value, onChange,
  autoFocus, autoComplete, required, rightSlot, extraStyle,
}: {
  label: string; type: string; placeholder: string; value: string
  onChange: (v: string) => void; autoFocus?: boolean; autoComplete?: string
  required?: boolean; rightSlot?: React.ReactNode; extraStyle?: React.CSSProperties
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {label}
      </label>
      <div className="relative">
        <input
          type={type} placeholder={placeholder} value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus} autoComplete={autoComplete} required={required}
          style={{
            ...inputBase,
            ...(focused ? { borderColor: '#F97316', boxShadow: '0 0 0 3px rgba(249,115,22,0.10)', backgroundColor: '#fff' } : {}),
            ...extraStyle,
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {rightSlot && <div className="absolute right-4 top-1/2 -translate-y-1/2">{rightSlot}</div>}
      </div>
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const { setEmployee } = useAuthStore()

  const [step, setStep] = useState<Step>('signin')
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await authApi.login(email.trim().toLowerCase(), password)
      
      // Request location permission immediately after login
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          () => console.log("Location permission granted"),
          (err) => console.warn("Location permission denied", err),
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        )
      }

      // Backend sets httpOnly cookies — no client-side token storage needed
      const meRes = await authApi.me()
      const me = meRes.data.data!
      navigate(`/welcome?name=${encodeURIComponent(me.full_name.split(' ')[0])}`, { replace: true })
      setEmployee(me)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Invalid email or password.')
    } finally { setLoading(false) }
  }

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res = await authApi.verifyEmail(email.trim().toLowerCase())
      const { first_name, has_password } = res.data.data!
      setFirstName(first_name); setPassword(''); setConfirmPassword('')
      if (has_password) { setStep('signin'); setError('Account already activated. Enter your password to sign in.') }
      else setStep('setup')
    } catch (err: any) {
      setError(err?.response?.status === 404 ? 'Email not found. Use your Gadiel work email.' : err?.response?.data?.detail || 'Something went wrong.')
    } finally { setLoading(false) }
  }

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      await authApi.setupPassword(email.trim().toLowerCase(), password, confirmPassword)
      // Backend sets httpOnly cookies — no client-side token storage needed
      const meRes = await authApi.me()
      navigate(`/welcome?name=${encodeURIComponent(firstName)}`, { replace: true })
      setEmployee(meRes.data.data!)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not activate account. Please try again.')
    } finally { setLoading(false) }
  }

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8" style={{ background: 'linear-gradient(135deg, #FFEADF 0%, #FFD6C8 20%, #F5E8FF 55%, #D6E4FF 100%)' }}>
      <main
        className="w-full max-w-[1200px] grid grid-cols-1 lg:grid-cols-[55%_45%] overflow-hidden bg-white lg:bg-transparent"
        style={{ borderRadius: '28px', boxShadow: '0 32px 72px rgba(15,31,92,0.22)', minHeight: 'auto' }}
      >

        {/* ═══════════════ LEFT PANEL ═══════════════ */}
        <section
          className="hidden lg:flex flex-col items-center justify-between py-14 px-10 relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #0B1A5E 0%, #1A2E70 55%, #1E3A8A 100%)' }}
        >
          {/* Dot-grid texture */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.065) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }} />

          {/* Concentric rings — top right */}
          {[480, 680, 880].map((size, i) => (
            <div key={i} className="absolute pointer-events-none rounded-full" style={{
              width: size, height: size,
              right: -(size * 0.42), top: -(size * 0.3),
              border: `1px solid rgba(0,200,232,${0.16 - i * 0.04})`,
            }} />
          ))}
          {/* Teal glow — bottom left */}
          <div className="absolute pointer-events-none" style={{
            width: 260, height: 260, bottom: -80, left: -80, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,200,232,0.1) 0%, transparent 70%)',
          }} />

          {/* ── Top label ── */}
          <div className="relative z-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(0,200,232,0.75)' }}>
              Gadiel Technologies Pvt. Ltd.
            </p>
          </div>

          {/* ── Hero copy (centered) ── */}
          <div className="relative z-10 text-center">
            <h1
              className="font-extrabold text-white leading-[1.08] mb-0"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2.8rem, 4vw, 3.8rem)' }}
            >
              Smart HRMS
            </h1>
            <h1
              className="font-extrabold leading-[1.08]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2.8rem, 4vw, 3.8rem)', color: '#00C8E8' }}
            >
              Smart Teams.
            </h1>
            {/* Teal accent rule */}
            <div style={{ width: 52, height: 3, backgroundColor: '#00C8E8', borderRadius: 99, margin: '18px auto' }} />
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.52)', maxWidth: 340, margin: '0 auto' }}>
              Your people, your projects, your HRMS —<br />all managed from one smart dashboard.
            </p>
          </div>

          {/* ── Service chips (quirky) ── */}
          <div className="relative z-10 flex flex-col items-center gap-3 w-full">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              What we do
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SERVICES.map((s) => (
                <span
                  key={s.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.09)',
                    color: 'rgba(255,255,255,0.78)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <span>{s.icon}</span>
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ RIGHT PANEL ═══════════════ */}
        <section
          className="flex flex-col justify-center px-6 md:px-14 py-10 md:py-14 relative overflow-hidden"
          style={{ backgroundColor: '#ffffff' }}
        >
          {/* Subtle tech background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Dot grid */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'radial-gradient(circle, rgba(59,130,246,0.07) 1px, transparent 1px)',
              backgroundSize: '36px 36px',
              opacity: 0.6,
            }} />
            {/* Bottom-right network rings */}
            <div style={{ position: 'absolute', width: 480, height: 480, border: '1px solid rgba(29,78,216,0.07)', borderRadius: '50%', right: -220, bottom: -200 }} />
            <div style={{ position: 'absolute', width: 320, height: 320, border: '1px solid rgba(0,200,232,0.05)', borderRadius: '50%', right: -130, bottom: -110 }} />
            {/* Top-left radial glow */}
            <div style={{ position: 'absolute', width: 280, height: 280, background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)', top: -100, left: -80 }} />
            {/* Floating nodes */}
            {[
              { r: 48, t: 160, s: 5, c: 'rgba(59,130,246,0.15)' },
              { r: 110, t: 120, s: 3, c: 'rgba(0,200,232,0.13)' },
              { r: 72, t: 230, s: 4, c: 'rgba(29,78,216,0.1)' },
              { r: 200, t: 80, s: 3, c: 'rgba(59,130,246,0.08)' },
              { r: 30, t: 300, s: 2, c: 'rgba(0,200,232,0.1)' },
            ].map((d, i) => (
              <div key={i} style={{ position: 'absolute', width: d.s, height: d.s, backgroundColor: d.c, borderRadius: '50%', right: d.r, top: d.t }} />
            ))}
          </div>

          {/* Form area */}
          <div className="relative z-10 max-w-sm w-full mx-auto">

            {/* Gadiel logo PNG — centered */}
            <div className="mb-8 flex justify-center">
              <img src="/gadiel_logo.png" alt="Gadiel Technologies Pvt. Ltd." style={{ height: 52, objectFit: 'contain', mixBlendMode: 'multiply' }} />
            </div>

            {/* ══ SIGN IN ══ */}
            {step === 'signin' && (
              <div className="animate-fade-up">
                <h2 className="text-3xl font-extrabold mb-1 text-center" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#0F172A' }}>
                  Welcome back
                </h2>
                <p className="mb-8 text-sm text-center" style={{ color: '#94A3B8' }}>Sign in to your Gadiel workspace</p>

                <form onSubmit={handleSignIn} className="space-y-5">
                  <Field label="Work Email" type="email" placeholder="name@gadieltechnologies.com"
                    value={email} onChange={setEmail} autoFocus autoComplete="email" required
                    rightSlot={<span className="material-symbols-outlined" style={{ color: '#CBD5E1', fontSize: '18px' }}>alternate_email</span>}
                  />
                  <Field label="Password" type={showPwd ? 'text' : 'password'} placeholder="••••••••"
                    value={password} onChange={setPassword} autoComplete="current-password" required
                    rightSlot={
                      <button type="button" onClick={() => setShowPwd(v => !v)}>
                        <span className="material-symbols-outlined" style={{ color: '#CBD5E1', fontSize: '18px' }}>{showPwd ? 'visibility_off' : 'lock'}</span>
                      </button>
                    }
                  />
                  {error && <ErrorBox message={error} />}
                  <PrimaryBtn loading={loading} label="Sign In" />
                </form>

                <p className="mt-8 text-sm text-center" style={{ color: '#94A3B8' }}>
                  New employee?{' '}
                  <button onClick={() => { setStep('email'); setEmail(''); setError('') }} className="font-bold hover:underline" style={{ color: '#F97316' }}>
                    Activate your account
                  </button>
                </p>
              </div>
            )}

            {/* ══ EMAIL VERIFY ══ */}
            {step === 'email' && (
              <div className="animate-fade-up">
                <BackBtn onClick={() => { setStep('signin'); setError('') }} />
                <h2 className="text-3xl font-extrabold mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#0F172A' }}>
                  Activate account
                </h2>
                <p className="mb-8 text-sm" style={{ color: '#94A3B8' }}>Enter your Gadiel work email to get started</p>

                <form onSubmit={handleVerifyEmail} className="space-y-5">
                  <Field label="Work Email" type="email" placeholder="name@gadieltechnologies.com"
                    value={email} onChange={setEmail} autoFocus autoComplete="email" required
                    rightSlot={<span className="material-symbols-outlined" style={{ color: '#CBD5E1', fontSize: '18px' }}>alternate_email</span>}
                  />
                  {error && <ErrorBox message={error} />}
                  <PrimaryBtn loading={loading} label="Continue" />
                </form>
              </div>
            )}

            {/* ══ SETUP PASSWORD ══ */}
            {step === 'setup' && (
              <div className="animate-fade-up">
                <BackBtn onClick={() => { setStep('email'); setPassword(''); setConfirmPassword(''); setError('') }} />
                <h2 className="text-3xl font-extrabold mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#0F172A' }}>
                  Hey, {firstName}!
                </h2>
                <p className="mb-1 text-sm" style={{ color: '#94A3B8' }}>Set a password to activate your account</p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-8" style={{ background: '#FFF7ED', color: '#F97316' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>check_circle</span>
                  {email}
                </span>

                <form onSubmit={handleSetupPassword} className="space-y-5">
                  <Field label="Create Password" type={showPwd ? 'text' : 'password'} placeholder="At least 8 characters"
                    value={password} onChange={setPassword} autoFocus autoComplete="new-password" required
                    rightSlot={
                      <button type="button" onClick={() => setShowPwd(v => !v)}>
                        <span className="material-symbols-outlined" style={{ color: '#CBD5E1', fontSize: '18px' }}>{showPwd ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    }
                  />
                  <div>
                    <Field label="Confirm Password" type={showConfirm ? 'text' : 'password'} placeholder="Re-enter your password"
                      value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" required
                      extraStyle={confirmPassword.length > 0 ? (passwordsMatch
                        ? { borderColor: '#16A34A', boxShadow: '0 0 0 3px rgba(22,163,74,0.08)' }
                        : { borderColor: '#DC2626', boxShadow: '0 0 0 3px rgba(220,38,38,0.08)' }) : {}}
                      rightSlot={
                        <button type="button" onClick={() => setShowConfirm(v => !v)}>
                          <span className="material-symbols-outlined" style={{ color: '#CBD5E1', fontSize: '18px' }}>{showConfirm ? 'visibility_off' : 'visibility'}</span>
                        </button>
                      }
                    />
                    {confirmPassword.length > 0 && !passwordsMatch && (
                      <p className="text-xs mt-1.5" style={{ color: '#DC2626' }}>Passwords do not match</p>
                    )}
                  </div>
                  {error && <ErrorBox message={error} />}
                  <PrimaryBtn loading={loading} label="Activate Account" disabled={!passwordsMatch || password.length < 8} />
                </form>
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  )
}

/* ── Reusable pieces ── */

function PrimaryBtn({ loading, label, disabled }: { loading: boolean; label: string; disabled?: boolean }) {
  return (
    <button type="submit" disabled={loading || disabled}
      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white text-base transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #EA580C 0%, #F97316 100%)', boxShadow: '0 6px 20px rgba(249,115,22,0.28)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {loading
        ? <><Loader2 className="w-4 h-4 animate-spin" /> Please wait…</>
        : <>{label} <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span></>
      }
    </button>
  )
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} type="button" className="flex items-center gap-1 text-xs font-semibold mb-6 hover:underline" style={{ color: '#94A3B8' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>arrow_back</span> Back
    </button>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm"
      style={{ background: 'rgba(220,38,38,0.05)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.12)' }}>
      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5" style={{ background: 'rgba(220,38,38,0.12)' }}>!</span>
      {message}
    </div>
  )
}
