import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrepentimientoForm } from '@/components/arrepentimiento-form'
import { LegalLayout } from '@/components/legal'

export const metadata: Metadata = { title: 'Botón de arrepentimiento — Gemma', description: 'Pedí arrepentirte de tu compra online dentro de los 10 días corridos. Sin cuenta y sin dar explicaciones.' }

export default function ArrepentimientoPage() {
  return <LegalLayout kicker="Legales" titulo="Botón de arrepentimiento" nota={<p><b>Botón de arrepentimiento (Res. 424/2020):</b> el formulario guarda cada pedido en la colección <code>arrepentimientos</code> de Firestore, manda un mail a <code>emailAvisos</code> y otro a la persona con el n.º de trámite. Se gestiona en el panel, sección «Arrepentimientos». El plazo y el alcance para productos personalizados dependen de «Cambios y devoluciones».</p>}>
    <p>Si compraste en Gemma por internet, podés <b>arrepentirte de la compra dentro de los 10 días corridos</b> de recibir el producto, sin dar explicaciones. Completá el formulario y te damos un número de trámite por email.</p>
    <ArrepentimientoForm />
    <p className="legal-aviso">No hace falta tener una cuenta. Pedir el arrepentimiento no te cuesta nada: los gastos de la devolución corren por cuenta nuestra. Más detalles en <Link href="/devoluciones">Cambios y devoluciones</Link> y en los <Link href="/terminos#arrepentimiento">Términos y condiciones</Link>.</p>
  </LegalLayout>
}
