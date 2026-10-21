import type { Metadata } from 'next'

// Página de los links de los mails (confirmar email, cambiar contraseña): no se indexa.
export const metadata: Metadata = { title: 'Tu cuenta', robots: { index: false, follow: false } }

export default function Layout({ children }: { children: React.ReactNode }) { return children }
