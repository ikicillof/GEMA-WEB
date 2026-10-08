import Link from 'next/link'

export function Footer() {
  return (
    <footer className="mt-12 border-t border-secondary/30 px-4 py-8 text-sm">
      <nav className="mb-4 flex flex-col gap-2">
        <Link href="/contacto">Contacto</Link>
        <Link href="/envios-y-pagos">Envíos y pagos</Link>
        <Link href="/faq">Preguntas frecuentes</Link>
        <Link href="/arrepentimiento">Botón de arrepentimiento</Link>
      </nav>
      <p>somosgemma.ar@gmail.com</p>
      <p className="mt-1 text-text/60">
        Hacemos que cada rincón brille 💫
      </p>
    </footer>
  )
}
