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
        style={{ clipPath: 'inset(0)', backgroundImage: 'radial-gradient(58% 52% at 88% 8%, rgba(255,77,0,.20), transparent 68%), radial-gradient(46% 46% at 4% 92%, rgba(255,77,0,.11), transparent 70%)' }}
      >
        <svg
          viewBox="894.02 80 377.93 336.06"
          aria-hidden="true"
          className="pointer-events-none text-[#FF4D00] opacity-[.08]"
          style={{ position: 'fixed', top: '50%', right: '-5%', width: 'min(680px, 86vw)', aspectRatio: '377.93/336.06', height: 'auto', marginTop: 'calc(min(680px, 86vw) * 336.06 / 377.93 / -2)', zIndex: 0 }}
        >
          <path fill="currentColor" d="M1184.09 248.293L1183.07 246.366C1177.73 236.181 1165.53 231.612 1165.04 231.419C1163.3 230.814 1160.5 230.043 1156.95 229.74C1156.17 229.658 1155.35 229.63 1154.41 229.63C1153.48 229.63 1152.57 229.658 1151.66 229.713H1151.25L1099.75 229.575H1038.17L1066.72 175.129L1092.87 125.28L1116.48 80H1037.21L1015.33 121.922L970.43 207.472H970.541L949.07 248.43C943.951 258.752 944.088 270.561 949.456 280.773C954.796 290.958 964.375 297.729 975.716 299.408C977.147 299.601 978.661 299.738 980.367 299.738H982.074L1050.09 299.656L1131.76 299.904L1158.05 350.028L1186.1 403.483C1186.1 403.483 1188.63 408.218 1192.73 415.98H1271.95L1206.05 290.325C1200.79 280.388 1192.73 265.056 1184.03 248.265L1184.09 248.293Z" />
          <path fill="currentColor" d="M996.69 356.607C996.69 349.34 993.167 342.651 987.442 339.018L959.751 321.456C950.97 315.896 939.739 315.896 930.959 321.456L903.268 339.018C897.543 342.651 894.019 349.34 894.019 356.607V398.253C893.936 400.07 894.019 404.254 896.496 408.41C897.818 410.585 899.276 411.906 899.854 412.401C904.176 416.062 909.324 416.062 911.14 415.98C922.508 415.457 930.931 415.98 942.602 415.842C943.042 415.842 944.859 415.842 948.465 415.842C963.742 415.787 971.367 415.842 973.376 415.842C975.055 415.842 978.165 415.842 979.789 415.842C980.478 415.842 989.451 415.897 994.185 408.41C996.8 404.254 996.773 399.96 996.663 398.253V356.607H996.69Z" />
        </svg>
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
