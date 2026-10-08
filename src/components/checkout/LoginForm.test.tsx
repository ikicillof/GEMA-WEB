import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LoginForm } from './LoginForm'
import * as supabaseClient from '@/lib/supabase/client'

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: vi.fn(),
}))

function mockSupabase({
  signInWithOtp,
  verifyOtp,
}: {
  signInWithOtp: ReturnType<typeof vi.fn>
  verifyOtp: ReturnType<typeof vi.fn>
}) {
  vi.mocked(supabaseClient.createSupabaseBrowserClient).mockReturnValue({
    auth: { signInWithOtp, verifyOtp },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls signInWithOtp on submit and does NOT call onAuthenticated', async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null })
    const verifyOtp = vi.fn()
    mockSupabase({ signInWithOtp, verifyOtp })
    const onAuthenticated = vi.fn()

    render(<LoginForm onAuthenticated={onAuthenticated} />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'cliente@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /enviarme el código/i }))

    await waitFor(() => expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'cliente@example.com',
      options: { shouldCreateUser: true },
    }))
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(onAuthenticated).not.toHaveBeenCalled()
  })

  it('calls verifyOtp after a successful signInWithOtp, and only then calls onAuthenticated', async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null })
    const verifyOtp = vi.fn().mockResolvedValue({ error: null })
    mockSupabase({ signInWithOtp, verifyOtp })
    const onAuthenticated = vi.fn()

    render(<LoginForm onAuthenticated={onAuthenticated} />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'cliente@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /enviarme el código/i }))
    await waitFor(() => expect(signInWithOtp).toHaveBeenCalled())
    expect(onAuthenticated).not.toHaveBeenCalled()

    const codeInput = await screen.findByLabelText(/código de verificación/i)
    fireEvent.change(codeInput, { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar código/i }))

    await waitFor(() =>
      expect(verifyOtp).toHaveBeenCalledWith({
        email: 'cliente@example.com',
        token: '123456',
        type: 'email',
      })
    )
    expect(onAuthenticated).toHaveBeenCalledWith('cliente@example.com')
  })

  it('shows an error and does NOT call onAuthenticated when verifyOtp fails', async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null })
    const verifyOtp = vi.fn().mockResolvedValue({ error: { message: 'invalid' } })
    mockSupabase({ signInWithOtp, verifyOtp })
    const onAuthenticated = vi.fn()

    render(<LoginForm onAuthenticated={onAuthenticated} />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'cliente@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /enviarme el código/i }))
    await waitFor(() => expect(signInWithOtp).toHaveBeenCalled())

    const codeInput = await screen.findByLabelText(/código de verificación/i)
    fireEvent.change(codeInput, { target: { value: '000000' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar código/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/no es válido o venció/i)
    expect(onAuthenticated).not.toHaveBeenCalled()
  })
})
