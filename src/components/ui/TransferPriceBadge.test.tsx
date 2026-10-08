import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TransferPriceBadge } from './TransferPriceBadge'

describe('TransferPriceBadge', () => {
  it('shows the derived transfer price, not the raw price', () => {
    render(<TransferPriceBadge price={10000} />)
    expect(screen.getByText(/9\.000/)).toBeInTheDocument()
  })

  it('mentions "transferencia" in the label', () => {
    render(<TransferPriceBadge price={10000} />)
    expect(screen.getByText(/transferencia/i)).toBeInTheDocument()
  })
})
