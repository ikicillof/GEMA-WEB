import { describe, it, expect, vi } from 'vitest'
import Page from './page'

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))

describe('Product page', () => {
  it('calls notFound() for an unknown product slug', async () => {
    await expect(
      Page({ params: Promise.resolve({ slug: 'no-existe' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('renders the product view for a known slug', async () => {
    const result = await Page({ params: Promise.resolve({ slug: 'lampara-lumalee' }) })
    expect(result).toBeTruthy()
  })
})
