import { Link, Text } from '@react-email/components'
import { C, Detalle, Layout, estilos, precio } from './layout'
import type { DatosMail } from './tipos'

const metodo = (m: DatosMail['metodoPago']) => (m === 'transferencia' ? 'Transferencia (pendiente de confirmar)' : 'Mercado Pago (pago aprobado)')

/** Aviso a la dueña: venta nueva. */
export default function NuevaVentaDuena({ d }: { d: DatosMail }) {
  const dato = { ...estilos.parrafo, margin: '0 0 4px' }
  return <Layout vista={`Venta nueva ${d.pedidoId}: ${d.cliente.nombre}, ${precio(d.total)}`}>
    <Text style={estilos.titulo}>Tenés una venta nueva</Text>
    <Text style={estilos.parrafo}>Pedido <b>{d.pedidoId}</b> · {d.fecha}</Text>
    <Link href={d.urlPanel} style={estilos.boton}>Ver la venta en el panel</Link>
    <Text style={estilos.etiqueta}>Pago</Text>
    <Text style={dato}>{metodo(d.metodoPago)}</Text>
    <Text style={estilos.etiqueta}>Cliente</Text>
    <Text style={dato}><b>{d.cliente.nombre}</b></Text>
    <Text style={dato}>{d.cliente.email}</Text>
    <Text style={dato}>{d.cliente.telefono}</Text>
    <Text style={estilos.etiqueta}>Productos</Text>
    <Detalle d={d} />
    <Text style={estilos.etiqueta}>Envío</Text>
    <Text style={dato}>{d.envioTexto}</Text>
    <Text style={{ ...dato, color: C.gris }}>{d.entregaTexto}</Text>
    {d.metodoPago === 'transferencia' && <Text style={{ ...estilos.parrafo, marginTop: '20px' }}>Cuando llegue la transferencia, marcá la venta como completada desde el panel: le avisamos al cliente automáticamente.</Text>}
  </Layout>
}
