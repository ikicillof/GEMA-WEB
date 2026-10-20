import { Link, Text } from '@react-email/components'
import { C, Detalle, Layout, estilos } from './layout'
import type { DatosMail } from './tipos'

/** Al cliente: cancelamos su pedido (una venta que todavía no se había cobrado). No incluye el motivo interno que escribió la dueña. */
export default function VentaCancelada({ d }: { d: DatosMail }) {
  const dato = { ...estilos.parrafo, margin: '0 0 4px' }
  return <Layout vista={`Cancelamos tu pedido ${d.pedidoId}`}>
    <Text style={estilos.titulo}>Cancelamos tu pedido, {d.cliente.nombre}</Text>
    <Text style={estilos.parrafo}>Te escribimos para avisarte que el pedido {d.pedidoId} quedó cancelado y no lo vamos a preparar.</Text>
    <Text style={estilos.parrafo}>No se hizo ningún cobro por este pedido. Si ya habías hecho una transferencia, respondé este mail con el comprobante y te la devolvemos.</Text>
    <Text style={estilos.etiqueta}>El pedido cancelado</Text>
    <Detalle d={d} />
    <Text style={dato}>Si todavía querés tus piezas, podés hacer un pedido nuevo cuando quieras.</Text>
    <Link href={d.urlTienda} style={estilos.botonOscuro}>Volver a la tienda</Link>
    <Text style={{ ...estilos.parrafo, color: C.gris, fontSize: '13px' }}>¿Dudas? Respondé este mail y te contestamos.</Text>
  </Layout>
}
