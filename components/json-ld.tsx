/** Datos estructurados (JSON-LD) para buscadores. Se escapa "<" para que ningún texto del catálogo pueda cerrar la etiqueta <script>. */
export function JsonLd({ datos }: { datos: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(datos).replace(/</g, '\\u003c')
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}
