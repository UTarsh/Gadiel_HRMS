import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export function WelcomePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const name = params.get('name') || 'there'

  const [countdown, setCountdown] = useState(4)

  useEffect(() => {
    if (countdown <= 0) {
      navigate('/', { replace: true })
      return
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown, navigate])

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center px-6 relative overflow-hidden">

      {/* Decorative background rings */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[500, 400, 300, 200].map((size, i) => (
          <div
            key={i}
            className="absolute rounded-full border border-white/10"
            style={{
              width: size,
              height: size,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
        <div className="absolute w-96 h-96 rounded-full bg-white/5 -top-24 -right-24" />
        <div className="absolute w-64 h-64 rounded-full bg-white/5 -bottom-16 -left-16" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-md w-full">

        {/* Success checkmark */}
        <div className="flex justify-center mb-10">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-white/10 flex items-center justify-center
                            ring-8 ring-white/10 shadow-2xl">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <path d="M8 20 L16 28 L32 12" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Welcome label */}
        <p className="text-white/60 text-sm font-semibold tracking-[0.2em] uppercase mb-4">
          Welcome to
        </p>

        {/* Organisation name */}
        <h1 className="text-white text-4xl font-extrabold leading-tight mb-3 drop-shadow-sm">
          Gadiel Technologies
        </h1>

        {/* Divider */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="h-px w-16 bg-white/20" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
          <div className="h-px w-16 bg-white/20" />
        </div>

        {/* User name */}
        <p className="text-white text-3xl font-bold mb-3 tracking-tight">
          {name}
        </p>

        {/* Sub-message */}
        <p className="text-white/70 text-base font-normal leading-relaxed mb-10 max-w-xs mx-auto">
          You're all set! Taking you to your dashboard now.
        </p>

        {/* Progress bar */}
        <div className="w-full bg-white/20 rounded-full h-1.5 mb-8 overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${((4 - countdown) / 4) * 100}%` }}
          />
        </div>

        {/* CTA Button */}
        <button
          onClick={() => navigate('/', { replace: true })}
          className="w-full h-14 rounded-2xl bg-white text-primary font-bold text-base
                     hover:bg-white/95 active:scale-[0.98] transition-all duration-150
                     flex items-center justify-center gap-2.5 shadow-xl"
        >
          <span>Continue to App</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <p className="text-white/40 text-xs mt-5 tracking-wide">
          Redirecting in {countdown}s...
        </p>
      </div>

    </div>
  )
}
