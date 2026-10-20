// Manda un mail de ejemplo de cada tipo (con datos inventados, asunto con [PRUEBA]) a un solo destinatario.
// Uso: npm run mails:ejemplo -- tu@email.com
import { armar, mandar } from '../lib/mail-core'
import type { DatosMail } from '../emails/tipos'

const destino = process.argv[2]
if (!destino) { console.error('Falta el email de destino: npm run mails:ejemplo -- tu@email.com'); process.exit(1) }

const base: DatosMail = {
  pedidoId: 'EJEMPLO0Pedido1',
  fecha: '19 de octubre de 2026, 15:42',
  cliente: { nombre: 'Ana Prueba', email: destino, telefono: '11 5555-1234' },
  lineas: [
    { nombre: 'Figura Perro Globo', color: 'Rojo', cantidad: 2, subtotal: 20000 },
    { nombre: 'Figura Gemi', color: 'Rosa', cantidad: 1, subtotal: 12000 },
  ],
  subtotal: 32000,
  descuento: 0,
  envioTexto: 'A domicilio · Correo Argentino',
  envioPrecio: 4800,
  entregaTexto: 'Av. Siempreviva 742, 3B, Olivos (CP 1636)',
  total: 36800,
  metodoPago: 'mercadopago',
  urlPanel: 'https://backend--gemmaweb.netlify.app/admin/ventas/EJEMPLO0Pedido1',
  transferencia: null,
  urlWhatsApp: 'https://wa.me/5491128397462?text=Hola%20Gemma',
  urlMisCompras: 'https://backend--gemmaweb.netlify.app/mis-compras',
  urlTienda: 'https://backend--gemmaweb.netlify.app/tienda',
}
const transferencia: DatosMail = {
  ...base,
  pedidoId: 'EJEMPLO0Pedido2',
  metodoPago: 'transferencia',
  descuento: 3200,
  total: 33600,
  urlPanel: 'https://backend--gemmaweb.netlify.app/admin/ventas/EJEMPLO0Pedido2',
  transferencia: { alias: 'gemma.tienda.ejemplo', titular: 'Titular de ejemplo', banco: 'Banco de ejemplo', provisorio: true },
  urlWhatsApp: 'https://wa.me/5491128397462?text=Hola%20Gemma%2C%20soy%20Ana%20Prueba.%20Te%20env%C3%ADo%20el%20comprobante%20del%20pedido%20EJEMPLO0Pedido2.',
}

const casos = [
  ['nueva_venta_duena', transferencia],
  ['nueva_venta_duena', base],
  ['confirmacion_cliente', transferencia],
  ['confirmacion_cliente', base],
  ['transferencia_completada', transferencia],
] as const

for (const [tipo, datos] of casos) {
  const mail = armar(tipo, datos, true, destino)
  mail.para = destino
  const id = await mandar(mail)
  console.log(`enviado  ${mail.asunto}  (${id})`)
}
process.exit(0)
