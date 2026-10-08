import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const css = readFileSync(
  join(import.meta.dirname, 'globals.css'),
  'utf-8'
)

describe('design tokens in globals.css', () => {
  const requiredTokens = [
    '--color-bg: #0F0F10',
    '--color-primary: #FF4DA6',
    '--color-secondary: #6D28D9',
    '--color-accent-cool: #00E6D2',
    '--color-accent-warm: #FFD93D',
    '--color-rest: #FFB4DB',
    '--color-text: #FFFFFF',
    '--radius-sm: 12px',
    '--radius-md: 20px',
    '--radius-lg: 32px',
    '--radius-full: 999px',
    '--shadow-float: 0 4px 16px rgba(15, 15, 16, 0.4)',
    '--shadow-glow-primary: 0 8px 28px rgba(255, 77, 166, 0.25)',
    '--shadow-sticker: 0 6px 18px rgba(0, 0, 0, 0.3)',
    '--font-sans: var(--font-poppins), sans-serif',
  ]

  it.each(requiredTokens)('defines token %s', (token) => {
    expect(css).toContain(token)
  })
})
