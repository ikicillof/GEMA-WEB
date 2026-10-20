import { Link, Text } from '@react-email/components'
import { C, Layout, estilos } from './layout'
import type { DatosArrepentimiento } from './arrepentimiento-duena'

/** Al cliente: constancia de que recibimos su solicitud de arrepentimiento, con el número de trámite. */
export default function ArrepentimientoCliente({ d }: { d: DatosArrepentimiento }) {
  const dato = { ...estilos.parrafo, margin: '0 0 4px' }
  return <Layout vista={`Recibimos tu solicitud de arrepentimiento. Trámite ${d.tramite}`}>
    <Text style={estilos.titulo}>Recibimos tu solicitud, {d.nombre}</Text>
    <Text style={estilos.parrafo}>Registramos tu pedido de arrepentimiento. Guardá este mail: es tu constancia.</Text>
    <Text style={estilos.etiqueta}>N.º de trámite</Text>
    <Text style={{ ...dato, fontSize: '20px', fontWeight: 700, letterSpacing: '0.04em' }}>{d.tramite}</Text>
    <Text style={{ ...dato, color: C.gris }}>{d.fecha}</Text>
    <Text style={estilos.etiqueta}>Pedido</Text>
    <Text style={dato}>N.º {d.pedido}</Text>
    <Text style={estilos.etiqueta}>Qué sigue</Text>
    <Text style={estilos.parrafo}>Te vamos a escribir a este email con las instrucciones para devolver el producto. Los gastos de la devolución corren por cuenta nuestra, y el reintegro se hace por el mismo medio de pago que usaste.</Text>
    <Link href={d.urlDevoluciones} style={estilos.botonOscuro}>Ver cambios y devoluciones</Link>
    <Text style={{ ...estilos.parrafo, color: C.gris, fontSize: '13px' }}>¿Dudas? Respondé este mail y te contestamos. Nombrá siempre tu número de trámite.</Text>
  </Layout>
}
