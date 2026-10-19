// Datos que usan las plantillas de mail. Se arman en el servidor (lib/server/emails.ts) a partir de la venta.
export type LineaMail = { nombre: string; color: string; cantidad: number; subtotal: number }

export type DatosMail = {
  pedidoId: string
  fecha: string
  cliente: { nombre: string; email: string; telefono: string }
  lineas: LineaMail[]
  subtotal: number
  descuento: number
  envioTexto: string // "A domicilio · Correo Argentino"
  envioPrecio: number
  entregaTexto: string // dirección o sucursal de retiro
  total: number
  metodoPago: 'mercadopago' | 'transferencia'
  urlPanel: string
  transferencia?: { alias: string; titular: string; banco: string; provisorio: boolean } | null
  urlWhatsApp: string // comprobante (transferencia) o consulta
  urlMisCompras: string
}
