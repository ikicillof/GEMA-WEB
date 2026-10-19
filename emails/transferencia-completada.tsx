import { Link, Text } from '@react-email/components'
import { C, Detalle, Layout, estilos } from './layout'
import type { DatosMail } from './tipos'

/** Al cliente: la dueña confirmó que llegó su transferencia. */
export default function TransferenciaCompletada({ d }: { d: DatosMail }) {
  const dato = { ...estilos.parrafo, margin: '0 0 4px' }
  return <Layout vista={`Recibimos tu transferencia. Pedido ${d.pedidoId}`}>
    <Text style={estilos.titulo}>Recibimos tu transferencia, {d.cliente.nombre}</Text>
    <Text style={estilos.parrafo}>Tu pedido {d.pedidoId} está confirmado y ya lo estamos preparando. Te avisamos cuando salga el envío.</Text>
    <Text style={estilos.etiqueta}>Tu pedido</Text>
    <Detalle d={d} />
    <Text style={estilos.etiqueta}>Envío</Text>
    <Text style={dato}>{d.envioTexto}</Text>
    <Text style={{ ...dato, color: C.gris }}>{d.entregaTexto}</Text>
    <Link href={d.urlMisCompras} style={estilos.botonOscuro}>Ver mis compras</Link>
    <Text style={{ ...estilos.parrafo, color: C.gris, fontSize: '13px' }}>¿Dudas? Respondé este mail y te contestamos.</Text>
  </Layout>
}
