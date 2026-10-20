import type { Metadata } from 'next'

// Página privada: no se indexa.
export const metadata: Metadata = { title: 'Mis compras', robots: { index: false, follow: false } }

export default function Layout({ children }: { children: React.ReactNode }) { return children }
