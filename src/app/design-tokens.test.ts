import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf-8')

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
  ]

  it.each(requiredTokens)('defines token %s', (token) => {
    expect(css).toContain(token)
  })
})
