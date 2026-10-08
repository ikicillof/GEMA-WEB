import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Footer } from './Footer'

describe('Footer', () => {
  it('links to the retraction button page (legal requirement in Argentina)', () => {
    render(<Footer />)
    expect(
      screen.getByRole('link', { name: /botón de arrepentimiento/i })
    ).toHaveAttribute('href', '/arrepentimiento')
  })

  it('links to shipping/payments and FAQ info pages', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: /envíos y pagos/i })).toHaveAttribute(
      'href',
      '/envios-y-pagos'
    )
    expect(screen.getByRole('link', { name: /preguntas frecuentes/i })).toHaveAttribute(
      'href',
      '/faq'
    )
  })

  it('shows the contact email', () => {
    render(<Footer />)
    expect(screen.getByText('somosgemma.ar@gmail.com')).toBeInTheDocument()
  })
})
