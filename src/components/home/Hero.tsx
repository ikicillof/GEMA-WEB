import Link from 'next/link'

export function Hero() {
  return (
    <section className="grid gap-6 px-4 py-10 md:grid-cols-2 md:items-center md:px-10">
      <div>
        <h1 className="mb-3 text-3xl font-semibold md:text-4xl">
          Hacemos que cada rincón brille 💫
        </h1>
        <p className="mb-6 text-text/80">
          Mirá lo que encontré para ese rincón que mirás todos los días y no
          ves. Objetos con personalidad, no organizadores genéricos.
        </p>
        <Link
          href="/categoria/lamparas"
          className="inline-block rounded-full bg-primary px-7 py-3.5 font-semibold text-text hover:shadow-[var(--shadow-glow-primary)]"
        >
          Ver productos
        </Link>
      </div>
      {/* Escena ilustrada "rincón de casa" con Gemi — placeholder visual hasta
          contar con la ilustración real (ver Unresolved decisions en el
          surface brief de home). */}
      <div
        data-testid="hero-scene"
        className="aspect-square rounded-lg bg-[#17171A] shadow-[var(--shadow-float)]"
      />
    </section>
  )
}
