'use client'

import { useEffect, useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, ArrowRight } from 'lucide-react'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      redirect: false,
    })

    if (result?.error) {
      setError('Credenciales no válidas')
      setIsLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-dvh bg-[#E9E4D8] flex flex-col md:flex-row items-stretch overflow-hidden font-sans selection:bg-[#F36A2D]/20">

      {/* Columna Izquierda: Branding & Mood */}
      <div className="hidden md:flex flex-col justify-between p-16 w-1/2 border-r border-[#DEDAD0]/60 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#F36A2D]/5 rounded-full blur-[120px]" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-[#111111] rounded-xl flex items-center justify-center">
              <span className="text-[#F36A2D] font-bold text-xl">a</span>
            </div>
            <span className="text-2xl font-semibold tracking-tighter text-[#111111]">abitaai.com</span>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-6xl lg:text-7xl font-display text-[#111111] leading-[1.1] mb-8">
            El futuro de <br />
            <span className="italic">tus ventas</span> <br />
            es inteligente
          </h1>
          <p className="text-[#6F6F6F] text-lg leading-relaxed font-light">
            Automatiza la atención al cliente con una identidad sofisticada y resultados reales.
          </p>
        </div>

      </div>

      {/* Columna Derecha: Formulario */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-16 relative">
        {/* Mobile Header */}
        <div className="md:hidden absolute top-8 left-8 flex items-center gap-2">
          <div className="h-8 w-8 bg-[#111111] rounded-lg flex items-center justify-center">
            <span className="text-[#F36A2D] font-bold text-sm">a</span>
          </div>
          <span className="font-semibold text-lg tracking-tight text-[#111111]">abitaai.com</span>
        </div>

        <div className="w-full max-w-sm space-y-10">
          <div className="space-y-3">
            <h2 className="text-3xl font-display text-[#111111]">Iniciar sesión</h2>
            <p className="text-[#6F6F6F] text-sm">Ingresa tus credenciales para continuar.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 group">
              <label className="text-[10px] font-bold text-[#6F6F6F] uppercase tracking-widest ml-1 transition-colors group-focus-within:text-[#F36A2D]">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="nombre@ejemplo.com"
                className="w-full bg-transparent border-b-2 border-[#DEDAD0] py-3 text-[#111111] placeholder-[#9A9A9A] focus:outline-none focus:border-[#F36A2D] transition-all text-sm"
              />
            </div>

            <div className="space-y-2 group">
              <label className="text-[10px] font-bold text-[#6F6F6F] uppercase tracking-widest ml-1 transition-colors group-focus-within:text-[#F36A2D]">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="w-full bg-transparent border-b-2 border-[#DEDAD0] py-3 text-[#111111] placeholder-[#9A9A9A] focus:outline-none focus:border-[#F36A2D] transition-all text-sm"
              />
            </div>

            {error && (
              <div className="text-xs font-medium text-rose-500 bg-rose-500/5 py-3 px-4 rounded-lg border border-rose-500/10 animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#111111] hover:bg-[#222] text-white rounded-full font-medium text-sm transition-all flex items-center justify-center group shadow-md"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  Entrar a la plataforma
                  <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-[10px] text-[#6F6F6F] leading-relaxed">
            Al ingresar, aceptas nuestros términos de servicio y políticas de privacidad.<br />
            © 2026 abitaai.com
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh bg-[#E9E4D8] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#F36A2D]" size={32} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
