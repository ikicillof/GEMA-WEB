import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ResultadoClient } from '@/components/resultado-client'

export const metadata: Metadata = { title: 'Tu compra — Gemma', robots: { index: false, follow: false } }

export default function ResultadoPage() {
  return <Suspense fallback={null}><ResultadoClient /></Suspense>
}
