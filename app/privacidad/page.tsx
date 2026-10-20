import type { Metadata } from 'next'
import Link from 'next/link'
import { Dato, EmailContacto, LegalLayout } from '@/components/legal'
import { VENDEDORA } from '@/lib/vendedora'

export const metadata: Metadata = { title: 'Política de privacidad — Gemma', description: 'Qué datos guarda Gemma, para qué los usa, con quién los comparte y cómo ejercer tus derechos según la Ley 25.326.' }

export default function PrivacidadPage() {
  return <LegalLayout kicker="Legales" titulo="Política de privacidad" nota={<p>Transferencia internacional: Firebase/Google, Netlify, Resend y Cloudinary procesan datos fuera de la Argentina. Pedile al abogado que confirme si hace falta algún mecanismo adicional (Ley 25.326, art. 12) y que revise la inscripción de la base de datos en el Registro Nacional de Bases de Datos de la AAIP.</p>}>
    <p>En Gemma cuidamos tus datos personales. Esta política explica qué datos guardamos, para qué, con quién los compartimos y cómo podés ejercer tus derechos, de acuerdo con la <b>Ley 25.326 de Protección de los Datos Personales</b> y sus normas complementarias.</p>

    <h2 id="responsable">1. Responsable de los datos</h2>
    <p><b><Dato v={VENDEDORA.razonSocial} /></b>, CUIT <Dato v={VENDEDORA.cuit} />, domicilio en <Dato v={VENDEDORA.domicilio} />. Contacto para temas de datos personales: <EmailContacto v={VENDEDORA.emailContacto} />.</p>
    <p>La base de datos se encuentra registrada ante la Agencia de Acceso a la Información Pública: <Dato v={VENDEDORA.registroAAIP} />.</p>

    <h2 id="datos">2. Qué datos guardamos</h2>
    <ul>
      <li><b>Tu cuenta:</b> nombre, email y la forma en que ingresás (email y contraseña o cuenta de Google). Tu contraseña la maneja el servicio de autenticación de Google (Firebase): nosotros no la vemos.</li>
      <li><b>Datos de envío:</b> nombre y apellido, DNI, teléfono, domicilio, código postal, localidad y provincia, o la sucursal de correo que elijas.</li>
      <li><b>Tus compras:</b> qué compraste, importes, método de pago, estado del pedido y su historial, y el identificador del pago. <b>No guardamos los datos de tu tarjeta</b>: el pago lo procesa Mercado Pago.</li>
      <li><b>Tu carrito:</b> los productos que dejás guardados en tu cuenta.</li>
      <li><b>Tus preferencias:</b> si querés o no recibir novedades por email.</li>
      <li><b>Solicitudes de arrepentimiento:</b> número de pedido, nombre, email y el motivo, si lo escribís.</li>
      <li><b>Datos técnicos mínimos:</b> el sitio usa el almacenamiento de tu navegador para mantener tu sesión y tu carrito. No usamos cookies de publicidad.</li>
    </ul>

    <h2 id="para-que">3. Para qué los usamos</h2>
    <ul>
      <li>Procesar tus compras, cobrar, fabricar y enviar tus pedidos, y avisarte del estado (la base es el contrato de compra).</li>
      <li>Atender tus consultas, cambios, devoluciones y solicitudes de arrepentimiento.</li>
      <li>Cumplir obligaciones legales, fiscales y contables, y prevenir fraudes y usos indebidos.</li>
      <li>Mandarte <b>novedades de Gemma por email, solo si diste tu consentimiento</b> (ver más abajo).</li>
    </ul>
    <p>No vendemos tus datos ni los usamos para fines distintos de los que explicamos acá.</p>

    <h2 id="con-quien">4. Con quién los compartimos</h2>
    <p>Para poder funcionar, compartimos solo los datos necesarios con estos servicios:</p>
    <ul>
      <li><b>Firebase (Google):</b> autenticación de cuentas y base de datos donde se guardan perfiles, pedidos y carritos.</li>
      <li><b>Mercado Pago:</b> procesa los pagos con tarjeta y otros medios. Recibe los datos necesarios para cobrar.</li>
      <li><b>Correo Argentino:</b> cotiza y entrega los envíos. Recibe los datos del destinatario (nombre, domicilio, teléfono) y el peso y las medidas del paquete.</li>
      <li><b>Resend:</b> envía los emails (confirmación de compra, avisos y novedades). Recibe tu dirección de email y el contenido del mensaje.</li>
      <li><b>Cloudinary:</b> aloja las imágenes y modelos de los productos y las imágenes de las novedades. No recibe datos de clientes.</li>
      <li><b>Netlify:</b> es donde está alojado el sitio.</li>
    </ul>
    <p>Algunos de estos proveedores procesan información en servidores ubicados fuera de la Argentina. Trabajamos con servicios que ofrecen garantías de seguridad y protección de datos. También podemos comunicar datos cuando lo exija una autoridad competente.</p>

    <h2 id="novedades">5. Novedades por email y cómo darte de baja</h2>
    <p>Solo te escribimos con novedades si tildás la casilla «Quiero recibir novedades de Gemma por email» (viene destildada) o si respondés que sí cuando te lo preguntamos. Solo mandamos a emails verificados.</p>
    <p>Podés dejar de recibirlas en cualquier momento: cada mail tiene un link <b>«Darme de baja»</b> que funciona con un clic y sin iniciar sesión, y también podés cambiarlo en <Link href="/mi-cuenta">Mi cuenta</Link>. Los mails de tus compras no son novedades: se mandan igual para informarte sobre tu pedido.</p>

    <h2 id="conservacion">6. Cuánto tiempo los conservamos</h2>
    <p>Guardamos tus datos mientras tengas cuenta y durante el tiempo que exijan las normas fiscales, contables y de defensa del consumidor para los registros de tus compras. Después se eliminan o se anonimizan.</p>

    <h2 id="derechos">7. Tus derechos y cómo ejercerlos</h2>
    <p>Tenés derecho a <b>acceder</b> a tus datos, <b>rectificarlos</b>, <b>actualizarlos</b> y pedir que se <b>supriman</b>. Para ejercerlos escribí a <EmailContacto v={VENDEDORA.emailContacto} /> con el asunto «Datos personales», desde el email con el que tenés tu cuenta, e indicá qué querés hacer. Respondemos el pedido de acceso dentro de los 10 días corridos, y los de rectificación o supresión dentro de los 5 días hábiles.</p>
    <p>Si pedís que borremos tus datos, vamos a eliminar tu cuenta y tus preferencias. Los registros que debemos conservar por obligaciones legales (por ejemplo, los de una compra ya realizada) se mantienen el tiempo que la ley exija, sin otro uso.</p>
    <p className="legal-aviso">El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley Nº 25.326. La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley Nº 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.</p>

    <h2 id="seguridad">8. Seguridad</h2>
    <p>Aplicamos medidas técnicas para proteger tus datos: conexión cifrada, control de acceso por roles para el equipo y registro de los cambios en el panel. Ningún sistema es infalible; si detectáramos un incidente que te afecte, te avisaríamos.</p>

    <h2 id="menores">9. Menores de edad</h2>
    <p>La tienda está pensada para mayores de 18 años. Si sos menor, comprá con la compañía de un adulto responsable.</p>

    <h2 id="cambios">10. Cambios en esta política</h2>
    <p>Si actualizamos esta política, publicamos la nueva versión en esta página con su fecha. Podés ver también los <Link href="/terminos">Términos y condiciones</Link> y la página de <Link href="/devoluciones">Cambios y devoluciones</Link>.</p>
  </LegalLayout>
}
