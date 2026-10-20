// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  DATOS DE LA VENDEDORA Y CONDICIONES COMERCIALES  —  el ÚNICO lugar donde completarlos
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Todo lo que está entre corchetes, como [CUIT], es un DATO PENDIENTE: se muestra tal cual (resaltado en amarillo) en las
// páginas legales y en el footer hasta que lo reemplaces por el valor real. Para completarlo: cambiá el texto entre comillas
// por el dato verdadero, sin corchetes (ej.: cuit: '30-12345678-9'). Cuando no quede ningún corchete, el aviso interno de
// las páginas legales (que solo ven admin y creador) deja de listar pendientes.
//
// Sin secretos: este archivo lo usa el servidor y también el navegador.

export const VENDEDORA = {
  nombreComercial: 'Gemma',
  razonSocial: '[RAZÓN SOCIAL]',
  cuit: '[CUIT]',
  condicionFiscal: '[CONDICIÓN FISCAL]',
  domicilio: '[DOMICILIO]',
  emailContacto: '[EMAIL DE CONTACTO]',
  sitio: 'gemma-oficial.com.ar',
  // Registro Nacional de Bases de Datos Personales (Agencia de Acceso a la Información Pública, Ley 25.326).
  registroAAIP: '[N.º DE INSCRIPCIÓN EN EL REGISTRO NACIONAL DE BASES DE DATOS]',
} as const

export const CONDICIONES = {
  // Ya se anuncia así en el sitio (footer y «Contacto»). Confirmala.
  demoraFabricacion: '7 a 14 días hábiles',
  plazoTransferencia: '[PLAZO PARA TRANSFERIR]',
  plazoCambios: '[PLAZO PARA CAMBIOS]',
  condicionesCambios: '[CONDICIONES DE CAMBIO]',
  plazoReintegro: '[PLAZO DE REINTEGRO]',
  plazoReclamoDanos: '[PLAZO PARA RECLAMAR POR DAÑOS EN EL ENVÍO]',
  criterioPersonalizados: '[CRITERIO PARA PRODUCTOS PERSONALIZADOS]',
} as const

// QR de Data Fiscal (ARCA, ex AFIP). Cuando lo tengas: guardá la imagen en /public (ej. public/data-fiscal.png) y completá
// `qrImagen: '/data-fiscal.png'` y `qrUrl` con la dirección a la que lleva el QR. Mientras tanto el footer muestra un espacio reservado.
export const DATA_FISCAL: { qrImagen: string | null; qrUrl: string | null } = { qrImagen: null, qrUrl: null }

export const FECHA_LEGALES = '20 de octubre de 2026'

export const esMarcador = (valor: string) => /^\[.+\]$/.test(valor.trim())

/** Datos que todavía están entre corchetes (para el aviso interno y para el doc de pendientes). */
export function marcadoresPendientes(): { clave: string; valor: string }[] {
  return [...Object.entries(VENDEDORA), ...Object.entries(CONDICIONES)]
    .filter(([, v]) => esMarcador(v))
    .map(([clave, valor]) => ({ clave, valor }))
}
