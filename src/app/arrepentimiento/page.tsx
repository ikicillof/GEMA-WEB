export default function Page() {
  return (
    <div className="px-4 py-10 md:px-10">
      <h1 className="mb-4 text-2xl font-semibold">Botón de arrepentimiento</h1>
      <p className="mb-4">
        Como compradora, tenés derecho a arrepentirte de tu compra dentro de
        los 10 días corridos desde que la recibís, sin tener que dar ningún
        motivo (Código Civil y Comercial, art. 1110; Ley de Defensa del
        Consumidor, art. 34; y Resolución 424/2020).
      </p>
      <p className="mb-4">
        Para ejercer este derecho, escribinos a{' '}
        <a href="mailto:somosgemma.ar@gmail.com" className="underline">
          somosgemma.ar@gmail.com
        </a>{' '}
        indicando el número de pedido. Te confirmamos la cancelación y te
        contamos cómo seguir con la devolución.
      </p>
    </div>
  )
}
