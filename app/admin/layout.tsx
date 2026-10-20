import type { Metadata } from 'next'
import { AdminShell } from '@/components/admin/admin-shell'
import '@/components/admin/admin.css'

// El panel no se indexa. La protección real está en el servidor: AdminShell verifica el rol en cada página y /api/admin/* en cada acción.
export const metadata: Metadata = { title: 'Panel — Gemma', robots: { index: false, follow: false } }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
