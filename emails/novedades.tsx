import { Img, Link, Text } from '@react-email/components'
import type { Parrafo } from '@/lib/novedades-formato'
import { C, Layout, estilos } from './layout'

/**
 * Mail de novedades a quienes pidieron recibirlas. Mismo Layout y estilos que los mails de venta.
 * El texto llega ya separado en nodos (ver lib/novedades-formato): React escapa todo, no se inyecta HTML.
 * `urlBaja` es el link «Darme de baja» de cada persona (en el envío masivo se reemplaza por uno firmado para cada una).
 */
export default function Novedades({ asunto, parrafos, imagen, urlBaja }: { asunto: string; parrafos: Parrafo[]; imagen: string | null; urlBaja: string }) {
  return <Layout vista={asunto}>
    <Text style={estilos.titulo}>{asunto}</Text>
    {imagen && <Img src={imagen} alt="" width="520" style={{ display: 'block', width: '100%', maxWidth: '520px', height: 'auto', borderRadius: '16px', margin: '0 0 20px' }} />}
    {parrafos.map((p, i) => <Text key={i} style={estilos.parrafo}>
      {p.map((n, j) => n.t === 'salto' ? <br key={j} />
        : n.t === 'negrita' ? <strong key={j}>{n.v}</strong>
        : n.t === 'link' ? <Link key={j} href={n.href} style={{ color: C.violeta, textDecoration: 'underline' }}>{n.v}</Link>
        : n.v)}
    </Text>)}
    <Text style={{ ...estilos.parrafo, color: C.gris, fontSize: '12px', lineHeight: '18px', margin: '28px 0 0', textAlign: 'center' }}>
      Recibís este mail porque pediste novedades de Gemma.<br />
      <Link href={urlBaja} style={{ color: C.gris, textDecoration: 'underline' }}>Darme de baja</Link>
    </Text>
  </Layout>
}
