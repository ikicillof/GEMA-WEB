import type { Metadata } from 'next'
import Link from 'next/link'
import { Dato, EmailContacto, LegalLayout } from '@/components/legal'
import { CONDICIONES, VENDEDORA } from '@/lib/vendedora'

export const metadata: Metadata = { title: 'Cambios y devoluciones — Gemma', description: 'Cómo cambiar o devolver un producto de Gemma, el derecho de arrepentimiento y los productos personalizados.' }

export default function DevolucionesPage() {
  return <LegalLayout kicker="Legales" titulo="Cambios y devoluciones" nota={<p><b>Productos personalizados en color:</b> elegir un color de una paleta estándar probablemente NO alcanza para considerar que un producto es «claramente personalizado» y excluirlo del arrepentimiento (Código Civil y Comercial, art. 1116, inc. c). Por eso el texto de abajo es conservador y deja el criterio final en el marcador. Que lo defina con el abogado antes de publicar.</p>}>
    <p>Queremos que estés contenta con tu compra. Acá explicamos cuándo y cómo podés arrepentirte, cambiar o devolver un producto. Esta página forma parte de los <Link href="/terminos">Términos y condiciones</Link>.</p>

    <h2 id="arrepentimiento">1. Arrepentimiento de la compra (10 días)</h2>
    <p>Como comprás a distancia, podés <b>arrepentirte y devolver el producto dentro de los 10 días corridos</b> desde que lo recibís, sin tener que dar explicaciones. Es un derecho que te da la ley (artículo 34 de la Ley 24.240 y artículos 1110 y siguientes del Código Civil y Comercial).</p>
    <ul>
      <li>Para pedirlo, usá el <Link href="/arrepentimiento"><b>Botón de arrepentimiento</b></Link> (siempre visible al pie del sitio). Vas a recibir por email un número de trámite.</li>
      <li>El producto tiene que estar en las mismas condiciones en que lo recibiste y, si es posible, con su embalaje.</li>
      <li><b>Los gastos de la devolución corren por cuenta de la vendedora.</b> Te indicamos cómo hacer el envío de vuelta.</li>
      <li>Te devolvemos el dinero <b>por el mismo medio de pago</b> que usaste, dentro de <Dato v={CONDICIONES.plazoReintegro} /> desde que recibimos el producto.</li>
    </ul>

    <h2 id="personalizados">2. Productos personalizados (y el color que elegís)</h2>
    <p>Todos los productos de Gemma se fabrican a pedido en el color que elegís. Pero <b>elegir un color de nuestra paleta no hace que el producto sea personalizado</b>: seguís teniendo el derecho de arrepentimiento del punto 1.</p>
    <p>La ley (artículo 1116, inciso c, del Código Civil y Comercial) excluye del arrepentimiento a los bienes <b>claramente personalizados</b> o confeccionados según tus especificaciones. Eso aplica, por ejemplo, a un pedido especial que acordamos con vos (un diseño propio, un texto, medidas o un color fuera de la paleta). En esos casos te lo avisamos <b>antes de que pagues</b>.</p>
    <p>Criterio de la vendedora: <Dato v={CONDICIONES.criterioPersonalizados} />.</p>
    <p>En cualquier caso, <b>la garantía legal por defectos se mantiene</b>: si tu producto personalizado llega con un defecto, lo resolvemos.</p>

    <h2 id="cambios">3. Cambios</h2>
    <p>Si querés cambiar tu producto por otro color o por otro producto, escribinos a <EmailContacto v={VENDEDORA.emailContacto} /> dentro de <Dato v={CONDICIONES.plazoCambios} />. Condiciones: <Dato v={CONDICIONES.condicionesCambios} />.</p>

    <h2 id="defectos">4. Si el producto llega con un defecto o dañado</h2>
    <ul>
      <li>Escribinos con tu número de pedido y fotos del producto y del paquete. Si fue un daño del envío, avisanos dentro de <Dato v={CONDICIONES.plazoReclamoDanos} />.</li>
      <li>Tenés la <b>garantía legal de 3 meses</b> desde la entrega (Ley 24.240). Podés elegir entre la reparación o el cambio sin cargo, o la devolución del dinero cuando corresponda.</li>
      <li>En estos casos los costos del envío de vuelta y del nuevo envío son por cuenta de la vendedora.</li>
    </ul>

    <h2 id="como">5. Cómo se hace una devolución, paso a paso</h2>
    <ol>
      <li>Pedí el arrepentimiento con el <Link href="/arrepentimiento">botón</Link> o escribinos por un cambio o un defecto.</li>
      <li>Te respondemos por email con las instrucciones para despachar el producto.</li>
      <li>Cuando lo recibimos y lo revisamos, hacemos el reintegro o el cambio.</li>
    </ol>

    <h2 id="consultas">6. Consultas y reclamos</h2>
    <p>Para cualquier duda escribinos a <EmailContacto v={VENDEDORA.emailContacto} />. Si no te sentís conforme con la respuesta, podés acudir a la <a href="https://www.argentina.gob.ar/produccion/defensadelconsumidor" target="_blank" rel="noreferrer">Dirección Nacional de Defensa del Consumidor</a> o a la oficina de tu jurisdicción.</p>
  </LegalLayout>
}
