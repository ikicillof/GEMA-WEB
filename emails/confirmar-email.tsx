import { Link, Text } from '@react-email/components'
import { C, Layout, estilos } from './layout'

/** «Confirmá tu email»: lo manda nuestro backend por Resend (en vez del mail genérico de Firebase) al crear una cuenta con email y contraseña. */
export default function ConfirmarEmail({ nombre, url }: { nombre: string; url: string }) {
  return <Layout vista="Confirmá tu email para activar tu cuenta de Gemma">
    <Text style={estilos.titulo}>{nombre ? `¡Hola, ${nombre}! Confirmá tu email` : '¡Hola! Confirmá tu email'}</Text>
    <Text style={estilos.parrafo}>Gracias por sumarte a Gemma. Tocá el botón para confirmar tu email y activar tu cuenta. Después ya podés ingresar y comprar.</Text>
    <Link href={url} style={{ ...estilos.boton, fontSize: '17px', padding: '18px 24px' }}>Confirmar mi email</Link>
    <Text style={{ ...estilos.parrafo, fontSize: '13px', color: C.gris, margin: '16px 0 4px' }}>Si el botón no funciona, copiá este enlace y pegalo en tu navegador:</Text>
    <Text style={{ ...estilos.parrafo, fontSize: '12px', wordBreak: 'break-all', margin: '0 0 16px' }}><Link href={url} style={{ color: C.violeta }}>{url}</Link></Text>
    <Text style={{ ...estilos.parrafo, fontSize: '13px', color: C.gris }}>Por seguridad, este enlace vence en unos días y se puede usar una sola vez. Si no fuiste vos, ignorá este mail: no se crea ni se cambia nada.</Text>
    <Text style={{ ...estilos.parrafo, margin: '24px 0 0' }}>Un abrazo,<br />Gemi y todo el equipo de Gemma</Text>
  </Layout>
}
