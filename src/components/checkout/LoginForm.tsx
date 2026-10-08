'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export function LoginForm({
  onAuthenticated,
}: {
  onAuthenticated: (email: string) => void
}) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const supabase = createSupabaseBrowserClient()
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    if (sendError) {
      setError('No pudimos enviarte el código. Probá de nuevo.')
      return
    }
    setCodeSent(true)
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const supabase = createSupabaseBrowserClient()
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    })
    if (verifyError) {
      setError('Ese código no es válido o venció. Pedí uno nuevo.')
      return
    }
    // La sesión queda confirmada recién acá, después de validar el código —
    // nunca al solo enviarlo (ver Review Focus: no asumir login sin verificar).
    onAuthenticated(email)
  }

  if (!codeSent) {
    return (
      <form onSubmit={handleSendCode} className="flex flex-col gap-3">
        <p>Para pagar necesitamos que ingreses tu email. Te mandamos un código, sin contraseña.</p>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          className="rounded-md bg-[#17171A] px-3 py-2"
        />
        {error && <p className="text-sm text-primary">{error}</p>}
        <button
          type="submit"
          className="rounded-full bg-primary px-7 py-3.5 font-semibold text-text"
        >
          Enviarme el código para pagar
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleVerifyCode} className="flex flex-col gap-3">
      <p>Te mandamos un código a {email}. Ingresalo para continuar.</p>
      <input
        type="text"
        inputMode="numeric"
        required
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="123456"
        className="rounded-md bg-[#17171A] px-3 py-2"
      />
      {error && <p className="text-sm text-primary">{error}</p>}
      <button
        type="submit"
        className="rounded-full bg-primary px-7 py-3.5 font-semibold text-text"
      >
        Confirmar código
      </button>
    </form>
  )
}
