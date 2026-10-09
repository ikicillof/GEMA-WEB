export default function Page() {
  return (
    <div className="px-4 py-10 md:px-10">
      <h1 className="mb-4 text-2xl font-semibold">Envíos y pagos</h1>
      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">Envíos</h2>
        <p>
          Enviamos a todo el país por Correo Argentino, con tarifa fija según
          tu zona. También podés retirar sin cargo en Vicente López.
        </p>
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold">Medios de pago</h2>
        <p>
          Mercado Pago (tarjetas, hasta 12 cuotas), transferencia bancaria o
          efectivo — estas dos últimas con 10% de descuento.
        </p>
      </section>
    </div>
  )
}
