import Link from 'next/link'
import { Dato, EmailContacto, LegalLayout } from '@/components/legal'
import { CONDICIONES, VENDEDORA } from '@/lib/vendedora'
import { metaPagina } from '@/lib/seo'

export const metadata = metaPagina({ titulo: 'Términos y condiciones', descripcion: 'Cómo comprar en Gemma: precios, formas de pago, envíos, cambios y devoluciones, arrepentimiento y jurisdicción.', ruta: '/terminos' })

export default function TerminosPage() {
  return <LegalLayout kicker="Legales" titulo="Términos y condiciones">
    <p>Estos términos regulan las compras que hacés en <b>{VENDEDORA.sitio}</b>. Leelos antes de comprar: al hacer un pedido los aceptás. Están pensados para que se entiendan, y se aplican junto con la Ley 24.240 de Defensa del Consumidor y el Código Civil y Comercial de la Nación.</p>

    <h2 id="vendedor">1. Datos del vendedor</h2>
    <ul>
      <li><b>Razón social:</b> <Dato v={VENDEDORA.razonSocial} /></li>
      <li><b>CUIT:</b> <Dato v={VENDEDORA.cuit} /></li>
      <li><b>Condición fiscal:</b> <Dato v={VENDEDORA.condicionFiscal} /></li>
      <li><b>Domicilio fiscal:</b> <Dato v={VENDEDORA.domicilio} /></li>
      <li><b>Email de contacto:</b> <EmailContacto v={VENDEDORA.emailContacto} /></li>
    </ul>
    <p>Los productos se venden bajo la marca «{VENDEDORA.nombreComercial}». También podés escribirnos desde la página de <Link href="/contacto">Contacto</Link>.</p>

    <h2 id="como-se-compra">2. Cómo se compra</h2>
    <ul>
      <li>Elegís los productos y el color, los sumás al carrito y completás tus datos de envío. Para comprar necesitás una cuenta (con email o con Google).</li>
      <li>Antes de pagar ves el detalle del pedido: productos, descuento si corresponde, costo de envío y total.</li>
      <li>La compra se confirma cuando se acredita el pago. Ahí te mandamos un email con el resumen. Si no lo ves, revisá la carpeta de spam.</li>
      <li>Podés ver tus pedidos y su estado en <Link href="/mis-compras">Mis compras</Link>.</li>
    </ul>

    <h2 id="precios">3. Precios</h2>
    <p>Los precios están expresados en <b>pesos argentinos</b> y son precios finales para el consumidor. El costo del envío no está incluido en el precio del producto: se calcula con tu código postal y se muestra antes de pagar. Los precios pueden cambiar, pero el que ves al confirmar tu pedido es el que se te cobra.</p>

    <h2 id="pagos">4. Formas de pago</h2>
    <ul>
      <li><b>Mercado Pago:</b> pagás en el sitio seguro de Mercado Pago con los medios que ellos habiliten (tarjetas, dinero en cuenta y otros). Gemma no recibe ni guarda los datos de tu tarjeta. Rigen además los términos de Mercado Pago.</li>
      <li><b>Transferencia bancaria, con descuento:</b> si pagás por transferencia se aplica un descuento sobre el valor de los productos. El porcentaje vigente lo ves en el checkout antes de pagar. Te mostramos el alias y los datos de la cuenta; después de transferir, mandás el comprobante por WhatsApp.</li>
    </ul>
    <p>Los pedidos por transferencia quedan esperando el pago. Si la transferencia no se acredita dentro de <Dato v={CONDICIONES.plazoTransferencia} />, el pedido puede cancelarse. Cuando verificamos que el dinero llegó, marcamos tu pedido como completado y te avisamos por email.</p>

    <h2 id="hecho-a-pedido">5. Productos hechos a pedido y demora</h2>
    <p>Los productos de Gemma son <b>objetos impresos en 3D que se fabrican después de que se acredita el pago</b>, en el color que elegiste. Por eso la demora de fabricación estimada es de <b>{CONDICIONES.demoraFabricacion}</b>, contados desde la acreditación del pago, y se suma al tiempo de envío.</p>
    <p>Por tratarse de piezas impresas, puede haber pequeñas diferencias de tono entre lo que ves en pantalla y el producto real, y las medidas son aproximadas. No se consideran defectos.</p>

    <h2 id="envios">6. Envíos</h2>
    <ul>
      <li>Enviamos por <b>Correo Argentino</b>, a domicilio o a sucursal, según lo que elijas en el checkout.</li>
      <li>El costo y el plazo del servicio se calculan con tu código postal y se muestran antes de pagar. Los plazos de entrega son <b>estimados</b> y los define el correo; empiezan a contar desde el despacho, no desde la compra.</li>
      <li>Es importante que los datos de entrega sean correctos y completos. Si hay un error en la dirección o nadie puede recibir el paquete, los costos de un nuevo envío pueden quedar a tu cargo.</li>
      <li>Si el paquete llega dañado, avisanos dentro de <Dato v={CONDICIONES.plazoReclamoDanos} /> con fotos del paquete y del producto.</li>
    </ul>

    <h2 id="cambios">7. Cambios y devoluciones</h2>
    <p>Los cambios, las devoluciones y el caso de los productos personalizados están explicados en la página de <Link href="/devoluciones">Cambios y devoluciones</Link>, que forma parte de estos términos.</p>

    <h2 id="arrepentimiento">8. Botón de arrepentimiento</h2>
    <p>Si compraste por internet, tenés derecho a <b>arrepentirte</b> y revocar la compra dentro de los <b>10 días corridos</b> contados desde que recibís el producto o desde que se celebró el contrato, lo que ocurra último (artículo 34 de la Ley 24.240 y artículos 1110 y siguientes del Código Civil y Comercial). Los gastos de la devolución corren por cuenta de Gemma.</p>
    <p>Para pedirlo usá el <Link href="/arrepentimiento"><b>Botón de arrepentimiento</b></Link>, que está siempre visible al pie de todas las páginas, como establece la Resolución 424/2020 de la Secretaría de Comercio Interior. Al enviarlo te damos un número de trámite por email.</p>

    <h2 id="garantia">9. Garantía legal</h2>
    <p>Todos los productos cuentan con la garantía legal de la Ley 24.240 por defectos o vicios que afecten su correcto funcionamiento o que hagan que lo entregado no sea lo que se ofreció: <b>tres (3) meses desde la entrega</b>. Si tu producto tiene un defecto, escribinos y lo resolvemos.</p>

    <h2 id="cuenta">10. Tu cuenta</h2>
    <p>Sos responsable de mantener segura tu cuenta y de que los datos que cargues sean verdaderos. Si notás un uso que no reconocés, avisanos. Podemos suspender una cuenta ante un uso fraudulento.</p>

    <h2 id="datos">11. Datos personales y comunicaciones</h2>
    <p>Tratamos tus datos como explicamos en la <Link href="/privacidad">Política de privacidad</Link>. Solo te mandamos novedades por email si lo pediste, y podés darte de baja cuando quieras desde cualquier mail o desde «Mi cuenta».</p>

    <h2 id="propiedad">12. Propiedad intelectual</h2>
    <p>Los diseños, textos, fotos, modelos 3D y la marca Gemma pertenecen a Gemma (el vendedor) o se usan con autorización. No pueden copiarse ni reproducirse sin permiso, salvo para uso personal.</p>

    <h2 id="cambios-terminos">13. Cambios en estos términos</h2>
    <p>Podemos actualizar estos términos. La versión vigente es la publicada en esta página al momento de tu compra, y esa es la que se aplica a tu pedido.</p>

    <h2 id="jurisdiccion">14. Ley aplicable y jurisdicción</h2>
    <p>Estos términos se rigen por las leyes de la República Argentina. Para cualquier conflicto sobre una compra, vas a poder elegir los tribunales ordinarios competentes del lugar de tu domicilio, según el artículo 36 de la Ley 24.240 y el artículo 2654 del Código Civil y Comercial.</p>
    <p>Antes, podés reclamar directamente por <EmailContacto v={VENDEDORA.emailContacto} />. También podés consultar o presentar un reclamo ante la <a href="https://www.argentina.gob.ar/produccion/defensadelconsumidor" target="_blank" rel="noreferrer">Dirección Nacional de Defensa del Consumidor</a> o la oficina de Defensa del Consumidor de tu jurisdicción.</p>
  </LegalLayout>
}
