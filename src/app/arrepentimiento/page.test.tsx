import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Page from './page'

describe('Botón de arrepentimiento page', () => {
  it('explains the right to retract and how to exercise it', () => {
    render(<Page />)
    expect(screen.getByRole('heading', { name: /botón de arrepentimiento/i })).toBeInTheDocument()
    expect(screen.getByText(/10 días/)).toBeInTheDocument()
    expect(screen.getByText('somosgemma.ar@gmail.com')).toBeInTheDocument()
  })
})
