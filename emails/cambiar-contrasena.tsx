import { Link, Text } from '@react-email/components'
import { C, Layout, estilos } from './layout'

/** «Cambiá tu contraseña»: lo manda nuestro backend por Resend (en vez del mail genérico de Firebase). */
export default function CambiarContrasena({ nombre, url }: { nombre: string; url: string }) {
  return <Layout vista="Cambiá tu contraseña de Gemma">
    <Text style={estilos.titulo}>{nombre ? `Hola, ${nombre}. Cambiá tu contraseña` : 'Hola. Cambiá tu contraseña'}</Text>
    <Text style={estilos.parrafo}>Recibimos un pedido para elegir una contraseña nueva en tu cuenta de Gemma. Tocá el botón para elegirla.</Text>
    <Link href={url} style={{ ...estilos.boton, fontSize: '17px', padding: '18px 24px' }}>Elegir mi nueva contraseña</Link>
    <Text style={{ ...estilos.parrafo, fontSize: '13px', color: C.gris, margin: '16px 0 4px' }}>Si el botón no funciona, copiá este enlace y pegalo en tu navegador:</Text>
    <Text style={{ ...estilos.parrafo, fontSize: '12px', wordBreak: 'break-all', margin: '0 0 16px' }}><Link href={url} style={{ color: C.violeta }}>{url}</Link></Text>
    <Text style={{ ...estilos.parrafo, fontSize: '13px', color: C.gris }}>Por seguridad, este enlace vence en 1 hora y se puede usar una sola vez. Si no fuiste vos, ignorá este mail: tu contraseña actual sigue funcionando y no se cambia nada.</Text>
    <Text style={{ ...estilos.parrafo, margin: '24px 0 0' }}>Un abrazo,<br />Gemi y todo el equipo de Gemma</Text>
  </Layout>
}
