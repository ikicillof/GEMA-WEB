import { Link, Section, Text } from '@react-email/components'
import { C, Layout, estilos } from './layout'
import type { DatosArrepentimientoCliente } from './arrepentimiento-tipos'

/** Al cliente: constancia cálida de que recibimos su solicitud de arrepentimiento. Sin ningún dato interno. */
export default function ArrepentimientoCliente({ d }: { d: DatosArrepentimientoCliente }) {
  const dato = { ...estilos.parrafo, margin: '0 0 4px' }
  return <Layout vista={`Recibimos tu solicitud de arrepentimiento. Trámite ${d.tramite}`}>
    {d.prueba && <Text style={{ ...estilos.parrafo, backgroundColor: '#FFD93D', borderRadius: '12px', padding: '8px 12px', fontSize: '13px', fontWeight: 600 }}>[PRUEBA] Este mail es de una solicitud de prueba.</Text>}
    <Text style={estilos.titulo}>Recibimos tu solicitud, {d.nombre}</Text>
    <Text style={estilos.parrafo}>Gracias por avisarnos. Ya registramos que querés arrepentirte de tu compra y no tenés que hacer nada más por ahora. Guardá este mail: es tu constancia.</Text>

    <Text style={estilos.etiqueta}>N.º de trámite</Text>
    <Section style={{ ...estilos.caja, textAlign: 'center' }}>
      <Text style={{ ...estilos.titulo, fontSize: '26px', letterSpacing: '0.04em', margin: 0, color: C.violeta }}>{d.tramite}</Text>
    </Section>
    <Text style={dato}>Solicitud del {d.fecha}</Text>
    {d.pedido && <Text style={dato}>Pedido N.º {d.pedido}</Text>}

    <Text style={estilos.etiqueta}>Qué pasa ahora</Text>
    <Text style={estilos.parrafo}>Te vamos a escribir a este email {d.plazoRespuesta} con las instrucciones para devolver el producto. Cuando lo recibamos, te devolvemos el dinero por el mismo medio de pago que usaste, {d.plazoReintegro}.</Text>
    <Link href={d.urlDevoluciones} style={estilos.botonOscuro}>Ver cambios y devoluciones</Link>

    <Text style={estilos.etiqueta}>Si necesitás escribirnos</Text>
    <Text style={dato}>Nombrá siempre tu número de trámite.</Text>
    {d.emailContacto && <Text style={dato}>Email: <Link href={`mailto:${d.emailContacto}`} style={{ color: C.violeta }}>{d.emailContacto}</Link></Text>}
    <Text style={dato}>WhatsApp: <Link href={d.urlWhatsApp} style={{ color: C.violeta }}>{d.whatsappVisible}</Link></Text>

    <Text style={{ ...estilos.parrafo, margin: '24px 0 0' }}>Un abrazo,<br />Gemi y todo el equipo de Gemma</Text>
  </Layout>
}
