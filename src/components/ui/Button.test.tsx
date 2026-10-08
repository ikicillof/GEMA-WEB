import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders children and applies the primary pill styling', () => {
    render(<Button variant="primary">Ver productos</Button>)
    const button = screen.getByRole('button', { name: 'Ver productos' })
    expect(button).toHaveClass('rounded-full')
    expect(button).toHaveClass('bg-primary')
  })

  it('renders the secondary variant with an outline', () => {
    render(<Button variant="secondary">Ver más</Button>)
    const button = screen.getByRole('button', { name: 'Ver más' })
    expect(button).toHaveClass('border-secondary')
  })

  it('respects the disabled prop', () => {
    render(<Button variant="primary" disabled>Agotado</Button>)
    expect(screen.getByRole('button', { name: 'Agotado' })).toBeDisabled()
  })
})
