'use client'

import { useEffect, useState, Suspense } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Turnstile } from '@marsidev/react-turnstile'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string>('')

  // Limpiar la URL si tiene callbackUrl redundante
  useEffect(() => {
    const callbackUrl = searchParams.get('callbackUrl')
    if (callbackUrl && (callbackUrl === window.location.origin || callbackUrl === window.location.origin + '/')) {
      window.history.replaceState({}, '', '/login')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const result = await signIn('credentials', {
      email,
      password,
      turnstileToken,
      redirect: false,
    })

    if (result?.error) {
      if (result.error === 'CredentialsSignin') {
        setError('Credenciales no válidas')
      } else {
        setError(result.error)
      }
      setIsLoading(false)
    } else {
      // Obtener la sesión actualizada para revisar el Rol
      const session = await getSession()
      const callbackUrl = searchParams.get('callbackUrl')

      if ((session?.user as any)?.role === 'ADMIN') {
        router.push('/admin')
      } else {
        if (callbackUrl && callbackUrl !== window.location.origin && callbackUrl !== window.location.origin + '/') {
          router.push(callbackUrl)
        } else {
          router.push('/inbox')
        }
      }
      router.refresh()
    }
  }

  const glass = {
    background: 'rgba(255,255,255,.40)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.85), inset 0 0 0 1px rgba(255,255,255,.30), 0 1px 2px rgba(66,54,36,.05), 0 10px 26px rgba(66,54,36,.07), 0 28px 60px rgba(66,54,36,.06)',
  } as const
  const field = 'w-full rounded-xl bg-white/60 px-4 py-3.5 text-sm text-[#1A1A1A] placeholder-[#8A8172] outline-none shadow-[inset_0_0_0_1px_rgba(138,129,114,.35)] focus:shadow-[inset_0_0_0_2px_#FF4D00]'

  return (
    <div className="min-h-dvh flex flex-col md:flex-row items-stretch font-sans selection:bg-[#FF4D00]/25">

      {/* Izquierda: marca (negro, como el hero) */}
      <div
        className="hidden md:flex flex-col justify-between p-16 w-1/2 bg-black text-[#EBE4D6] relative overflow-hidden"
        style={{ backgroundImage: 'radial-gradient(52% 46% at 8% 6%, rgba(255,77,0,.18), transparent 70%), radial-gradient(48% 44% at 96% 88%, rgba(255,77,0,.12), transparent 72%)' }}
      >
        <div className="relative z-10 flex flex-col gap-10">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-[#B8B0A3] hover:text-[#EBE4D6] w-fit">
            <ArrowRight size={14} className="rotate-180" />
            Regresar
          </Link>
          <div className="flex items-center gap-3">
            <img src="/assets/logos/logo-light.png?v=2" alt="Abita AI" className="h-10 w-10 object-contain rounded-xl" />
            <span className="text-2xl font-extrabold tracking-tight text-[#EBE4D6]">Abita AI</span>
          </div>
        </div>

        <div className="relative z-10 max-w-md my-auto">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-[.07em] text-[#FF4D00] mb-8"
            style={{ background: 'rgba(255,77,0,.14)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.18), inset 0 0 0 1px rgba(255,77,0,.3)' }}
          >
            <span className="w-[7px] h-[7px] rounded-full bg-[#FF4D00]" />
            AI Powered Platform
          </span>
          <h1 className="text-5xl lg:text-6xl font-extrabold tracking-[-.035em] leading-[1.06] text-[#EBE4D6] mb-6">
            El futuro de la comunicación es inteligente<span className="text-[#FF4D00]">.</span>
          </h1>
          <p className="text-[#B8B0A3] text-lg leading-relaxed">
            Escala tu capacidad de respuesta con IA. Automatización perfecta, interacciones precisas y resultados que impulsan tu crecimiento.
          </p>
        </div>

        <div className="relative z-10 text-xs text-[#A3A3A3]">© 2026 Abita AI</div>
      </div>

      {/* Derecha: formulario (beige + vidrio) */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-6 md:p-16 relative bg-[#EBE4D6]"
        style={{ backgroundImage: 'radial-gradient(58% 52% at 88% 8%, rgba(255,77,0,.20), transparent 68%), radial-gradient(46% 46% at 4% 92%, rgba(255,77,0,.11), transparent 70%)' }}
      >
        <div className="md:hidden absolute top-6 left-6 flex items-center gap-2">
          <img src="/assets/logos/logo-light.png?v=2" alt="Abita AI" className="h-8 w-8 object-contain rounded-xl" />
          <span className="font-extrabold text-lg tracking-tight text-[#1A1A1A]">Abita AI</span>
        </div>

        <div className="w-full max-w-md p-8 md:p-10 rounded-[28px] space-y-8" style={glass}>
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold tracking-[-.025em] text-[#1A1A1A]">Iniciar sesión<span className="text-[#FF4D00]">.</span></h2>
            <p className="text-[#5C5C5C] text-sm">Ingresa tus credenciales para continuar.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#B33500] uppercase tracking-[.09em]">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="nombre@ejemplo.com"
                className={field}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#B33500] uppercase tracking-[.09em]">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  className={field + ' pr-12'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5C5C5C] hover:text-[#1A1A1A]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs font-semibold text-[#B33500] bg-[#FFE5DB] py-3 px-4 rounded-xl">
                {error}
              </div>
            )}

            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
              <div className="flex justify-center py-1">
                <Turnstile
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                  onSuccess={(token) => setTurnstileToken(token)}
                  options={{ theme: 'light' }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[50px] rounded-xl font-semibold text-base text-black flex items-center justify-center gap-2 disabled:opacity-70"
              style={{
                background: 'linear-gradient(180deg, #FF6220 0%, #FF4D00 46%, #F04400 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.45), 0 1px 3px rgba(255,77,0,.24), 0 6px 16px rgba(255,77,0,.26)',
              }}
            >
              {isLoading ? (
                <Loader2 size={18} />
              ) : (
                <>
                  Entrar a la plataforma
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-[#5C5C5C] leading-relaxed">
            Al ingresar, aceptas nuestros{' '}
            <a href="/terms" className="underline hover:text-[#1A1A1A]">términos de servicio</a>{' '}
            y{' '}
            <a href="/privacy" className="underline hover:text-[#1A1A1A]">políticas de privacidad</a>.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh bg-[#EBE4D6] flex items-center justify-center">
        <Loader2 className="text-[#FF4D00]" size={32} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
