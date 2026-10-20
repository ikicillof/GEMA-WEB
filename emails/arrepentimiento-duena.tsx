import { Link, Text } from '@react-email/components'
import { C, Layout, estilos } from './layout'

export type DatosArrepentimiento = {
  tramite: string
  pedido: string
  nombre: string
  email: string
  motivo: string
  fecha: string
  pedidoEncontrado: boolean
  emailCoincide: boolean
  urlPanel: string
  urlDevoluciones: string
}

/** A la dueña: alguien usó el botón de arrepentimiento. */
export default function ArrepentimientoDuena({ d }: { d: DatosArrepentimiento }) {
  const dato = { ...estilos.parrafo, margin: '0 0 4px' }
  return <Layout vista={`Arrepentimiento ${d.tramite}: pedido ${d.pedido}`}>
    <Text style={estilos.titulo}>Nueva solicitud de arrepentimiento</Text>
    <Text style={estilos.parrafo}>{d.nombre} pidió arrepentirse de una compra. Tenés que contestarle por email con las instrucciones de la devolución.</Text>
    <Text style={estilos.etiqueta}>Trámite</Text>
    <Text style={{ ...dato, fontWeight: 700 }}>{d.tramite}</Text>
    <Text style={{ ...dato, color: C.gris }}>{d.fecha}</Text>
    <Text style={estilos.etiqueta}>Pedido</Text>
    <Text style={dato}>N.º {d.pedido}</Text>
    <Text style={{ ...dato, color: d.pedidoEncontrado ? C.texto : '#B42318' }}>{d.pedidoEncontrado ? 'Encontramos ese pedido en el sistema.' : 'No encontramos un pedido con ese número. Revisalo antes de responder.'}</Text>
    {d.pedidoEncontrado && <Text style={{ ...dato, color: d.emailCoincide ? C.texto : '#B42318' }}>{d.emailCoincide ? 'El email coincide con el del pedido.' : 'El email NO coincide con el del pedido. Verificá la identidad antes de gestionar.'}</Text>}
    <Text style={estilos.etiqueta}>Quién lo pide</Text>
    <Text style={dato}>{d.nombre}</Text>
    <Text style={dato}>{d.email}</Text>
    {d.motivo && <>
      <Text style={estilos.etiqueta}>Motivo (opcional)</Text>
      <Text style={{ ...estilos.parrafo, whiteSpace: 'pre-wrap' }}>{d.motivo}</Text>
    </>}
    <Link href={d.urlPanel} style={estilos.botonOscuro}>Ver en el panel</Link>
    <Text style={{ ...estilos.parrafo, color: C.gris, fontSize: '13px' }}>Respondé este mail para escribirle directamente a la persona.</Text>
  </Layout>
}
