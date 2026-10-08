import Link from 'next/link'

export function Footer() {
  return (
    <footer className="mt-12 border-t border-secondary/30 px-4 py-8 text-sm">
      <nav aria-label="Enlaces del pie de página" className="mb-4 flex flex-col gap-2">
        <Link href="/contacto">Contacto</Link>
        <Link href="/envios-y-pagos">Envíos y pagos</Link>
        <Link href="/faq">Preguntas frecuentes</Link>
        <Link href="/arrepentimiento">Botón de arrepentimiento</Link>
      </nav>
      <p>
        <a href="mailto:somosgemma.ar@gmail.com">somosgemma.ar@gmail.com</a>
      </p>
      <p className="mt-1 text-text/60">
        Hacemos que cada rincón brille 💫
      </p>
    </footer>
  )
}
