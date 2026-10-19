import { Body, Container, Head, Html, Preview, Section, Text } from '@react-email/components'
import type { ReactNode } from 'react'
import type { DatosMail } from './tipos'

// Tokens del brand book (app/globals.css): grafito, rosa Gemma, crema y violeta. Poppins con respaldo Arial, porque los clientes de mail no cargan fuentes web.
export const C = { grafito: '#0F0F10', rosa: '#FF4DA6', crema: '#FFF9F5', violeta: '#6D28D9', texto: '#2A2A2C', gris: '#6B6B70', linea: '#EADFD8' }
const fuente = "Poppins, 'Helvetica Neue', Arial, sans-serif"

export const precio = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export const estilos = {
  titulo: { fontFamily: fuente, fontSize: '24px', lineHeight: '32px', fontWeight: 700, color: C.grafito, margin: '0 0 12px' },
  parrafo: { fontFamily: fuente, fontSize: '15px', lineHeight: '24px', color: C.texto, margin: '0 0 16px' },
  etiqueta: { fontFamily: fuente, fontSize: '11px', lineHeight: '16px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: C.violeta, margin: '24px 0 6px' },
  boton: { display: 'block', fontFamily: fuente, fontSize: '15px', fontWeight: 600, color: C.grafito, backgroundColor: C.rosa, borderRadius: '999px', padding: '14px 24px', textAlign: 'center' as const, textDecoration: 'none', margin: '8px 0' },
  botonOscuro: { display: 'block', fontFamily: fuente, fontSize: '15px', fontWeight: 600, color: '#FFFFFF', backgroundColor: C.grafito, borderRadius: '999px', padding: '14px 24px', textAlign: 'center' as const, textDecoration: 'none', margin: '8px 0' },
  caja: { backgroundColor: '#FFFFFF', border: `1px solid ${C.linea}`, borderRadius: '16px', padding: '16px 18px', margin: '0 0 16px' },
}

export function Layout({ vista, children }: { vista: string; children: ReactNode }) {
  return <Html lang="es">
    <Head><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
    <Preview>{vista}</Preview>
    <Body style={{ backgroundColor: C.crema, margin: 0, padding: '0 0 32px', fontFamily: fuente }}>
      <Section style={{ backgroundColor: C.grafito, padding: '22px 20px', textAlign: 'center' }}>
        <Text style={{ fontFamily: fuente, fontSize: '26px', fontWeight: 700, letterSpacing: '0.04em', color: '#FFFFFF', margin: 0 }}>Gemma<span style={{ color: C.rosa }}>.</span></Text>
      </Section>
      <Container style={{ width: '100%', maxWidth: '560px', padding: '28px 20px 0' }}>
        {children}
        <Text style={{ fontFamily: fuente, fontSize: '12px', lineHeight: '18px', color: C.gris, margin: '28px 0 0', textAlign: 'center' }}>
          Gemma · Figuras impresas en 3D<br />gemma-oficial.com.ar
        </Text>
      </Container>
    </Body>
  </Html>
}

/** Lista de productos + totales. Una sola columna, para que se lea bien en el celular. */
export function Detalle({ d }: { d: DatosMail }) {
  const fila = { fontFamily: fuente, fontSize: '14px', lineHeight: '22px', color: C.texto, margin: 0 }
  return <Section style={estilos.caja}>
    {d.lineas.map((l, i) => <table key={i} width="100%" role="presentation" style={{ borderBottom: `1px solid ${C.linea}`, padding: '8px 0' }}><tbody><tr>
      <td><Text style={{ ...fila, fontWeight: 600 }}>{l.nombre}</Text><Text style={{ ...fila, color: C.gris }}>{l.color} · x{l.cantidad}</Text></td>
      <td align="right" style={{ verticalAlign: 'top' }}><Text style={{ ...fila, fontWeight: 600 }}>{precio(l.subtotal)}</Text></td>
    </tr></tbody></table>)}
    <table width="100%" role="presentation" style={{ marginTop: '10px' }}><tbody>
      <tr><td><Text style={fila}>Productos</Text></td><td align="right"><Text style={fila}>{precio(d.subtotal)}</Text></td></tr>
      {d.descuento > 0 && <tr><td><Text style={fila}>Descuento por transferencia</Text></td><td align="right"><Text style={fila}>- {precio(d.descuento)}</Text></td></tr>}
      <tr><td><Text style={fila}>Envío</Text></td><td align="right"><Text style={fila}>{precio(d.envioPrecio)}</Text></td></tr>
      <tr><td><Text style={{ ...fila, fontWeight: 700, fontSize: '16px' }}>Total</Text></td><td align="right"><Text style={{ ...fila, fontWeight: 700, fontSize: '16px' }}>{precio(d.total)}</Text></td></tr>
    </tbody></table>
  </Section>
}
