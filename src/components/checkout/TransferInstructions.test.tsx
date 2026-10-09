import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TransferInstructions } from './TransferInstructions'

describe('TransferInstructions', () => {
  it('shows the order id so the customer can reference it', () => {
    render(<TransferInstructions orderId="order-123" total={35500} />)
    expect(screen.getByText(/order-123/)).toBeInTheDocument()
  })

  it('shows the total to transfer', () => {
    render(<TransferInstructions orderId="order-123" total={35500} />)
    expect(screen.getByText(/35\.500/)).toBeInTheDocument()
  })
})
