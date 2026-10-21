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
  razonSocial: 'BRELIS LEANDRO GUSTAVO',
  cuit: '20-35067988-0',
  condicionFiscal: 'Responsable Monotributo',
  domicilio: 'Esmeralda 2902, Florida (CP 1602), Provincia de Buenos Aires',
  emailContacto: 'somosgemma.ar@gmail.com',
  sitio: 'gemma-oficial.com.ar',
  // Perfil de Instagram de la MARCA (https://www.instagram.com/…), para los datos estructurados del home (SEO). Mientras sea un marcador no se publica.
  instagram: '[URL DE INSTAGRAM DE LA MARCA]',
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
  // Cuánto tardamos en contactar a quien usó el botón de arrepentimiento (va en el mail de constancia).
  plazoRespuestaArrepentimiento: '[PLAZO DE RESPUESTA AL ARREPENTIMIENTO]',
  plazoReclamoDanos: '[PLAZO PARA RECLAMAR POR DAÑOS EN EL ENVÍO]',
  criterioPersonalizados: '[CRITERIO PARA PRODUCTOS PERSONALIZADOS]',
} as const

// QR de Data Fiscal (ARCA, ex AFIP). Cuando lo tengas: guardá la imagen en /public (ej. public/data-fiscal.png) y completá
// `qrImagen: '/data-fiscal.png'` y `qrUrl` con la dirección a la que lleva el QR. Mientras tanto el footer muestra un espacio reservado.
// Cargado el 21/10 con el código de Data Fiscal de ARCA. La imagen oficial (DATAWEB.jpg) se guarda en /public para no depender de un servidor
// externo (el original por http no carga desde un sitio https); el link es el oficial de ARCA y lleva a la página que valida la inscripción.
export const DATA_FISCAL: { qrImagen: string | null; qrUrl: string | null } = {
  qrImagen: '/data-fiscal.jpg',
  qrUrl: 'http://qr.afip.gob.ar/?qr=K2n6Gnj7sF4UWzddMF5umA,,',
}

export const FECHA_LEGALES = '20 de octubre de 2026'

export const esMarcador = (valor: string) => /^\[.+\]$/.test(valor.trim())

/** Datos que todavía están entre corchetes (para el aviso interno y para el doc de pendientes). */
export function marcadoresPendientes(): { clave: string; valor: string }[] {
  return [...Object.entries(VENDEDORA), ...Object.entries(CONDICIONES)]
    .filter(([, v]) => esMarcador(v))
    .map(([clave, valor]) => ({ clave, valor }))
}
