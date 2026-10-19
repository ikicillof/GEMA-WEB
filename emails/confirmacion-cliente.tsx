import { Link, Section, Text } from '@react-email/components'
import { C, Detalle, Layout, estilos, precio } from './layout'
import type { DatosMail } from './tipos'

/** Confirmación al cliente: su pedido y, si paga por transferencia, cómo hacerlo. */
export default function ConfirmacionCliente({ d }: { d: DatosMail }) {
  const transfer = d.metodoPago === 'transferencia'
  const dato = { ...estilos.parrafo, margin: '0 0 4px' }
  return <Layout vista={transfer ? `Recibimos tu pedido ${d.pedidoId}. Falta tu transferencia de ${precio(d.total)}` : `Recibimos tu pago. Pedido ${d.pedidoId}`}>
    <Text style={estilos.titulo}>{transfer ? `Gracias, ${d.cliente.nombre}. Falta tu transferencia` : `Gracias, ${d.cliente.nombre}. Recibimos tu pago`}</Text>
    <Text style={estilos.parrafo}>{transfer
      ? `Reservamos tu pedido ${d.pedidoId}. Apenas veamos la transferencia empezamos a prepararlo.`
      : `Tu pedido ${d.pedidoId} está confirmado. Ya lo estamos preparando.`}</Text>

    {transfer && <>
      <Text style={estilos.etiqueta}>Cómo pagar</Text>
      <Section style={estilos.caja}>
        <Text style={{ ...dato, fontSize: '18px', fontWeight: 700 }}>Transferí {precio(d.total)}</Text>
        {d.transferencia ? <>
          <Text style={dato}>Alias: <b>{d.transferencia.alias}</b></Text>
          {d.transferencia.titular && <Text style={dato}>Titular: {d.transferencia.titular}</Text>}
          {d.transferencia.banco && <Text style={dato}>Banco: {d.transferencia.banco}</Text>}
          {d.transferencia.provisorio && <Text style={{ ...dato, color: C.violeta }}>Datos de ejemplo: todavía no transfieras a este alias.</Text>}
        </> : <Text style={dato}>Escribinos por WhatsApp y te pasamos los datos para transferir.</Text>}
        <Text style={{ ...dato, color: C.gris }}>Indicá el número de pedido {d.pedidoId} en la transferencia.</Text>
      </Section>
      <Link href={d.urlWhatsApp} style={estilos.boton}>Enviar comprobante por WhatsApp</Link>
    </>}

    <Text style={estilos.etiqueta}>Tu pedido</Text>
    <Detalle d={d} />
    <Text style={estilos.etiqueta}>Envío</Text>
    <Text style={dato}>{d.envioTexto}</Text>
    <Text style={{ ...dato, color: C.gris }}>{d.entregaTexto}</Text>
    <Link href={d.urlMisCompras} style={estilos.botonOscuro}>Ver mis compras</Link>
    <Text style={{ ...estilos.parrafo, color: C.gris, fontSize: '13px' }}>¿Dudas? Respondé este mail y te contestamos.</Text>
  </Layout>
}
