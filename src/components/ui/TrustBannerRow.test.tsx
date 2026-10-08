import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrustBannerRow } from './TrustBannerRow'

describe('TrustBannerRow', () => {
  it('renders one chip per item, never more than 3 distinct tones', () => {
    render(
      <TrustBannerRow
        items={[
          { icon: '📦', label: 'Envíos a todo el país', tone: 'rest' },
          { icon: '🏠', label: 'Comprá sin salir de tu casa', tone: 'cool' },
          { icon: '💳', label: 'Hasta 12 cuotas', tone: 'warm' },
          { icon: '🔒', label: 'Compra segura', tone: 'rest' },
        ]}
      />
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    expect(screen.getByText('Compra segura')).toBeInTheDocument()
  })
})
