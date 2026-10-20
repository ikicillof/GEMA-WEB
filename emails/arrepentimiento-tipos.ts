// Datos de los dos mails del botón de arrepentimiento. Son tipos SEPARADOS a propósito: el del cliente no tiene ningún campo interno
// (si el pedido existe, si el email coincide, link al panel), así que esos datos no pueden llegar a su mail por error.
type Base = {
  tramite: string
  pedido: string
  nombre: string
  /** Fecha y hora de la solicitud, ya formateadas. */
  fecha: string
  /** Solicitud hecha sobre una venta de prueba: los asuntos llevan [PRUEBA]. */
  prueba: boolean
}

/** Mail a la dueña ("Nueva solicitud de arrepentimiento"): todo lo que necesita para gestionarla. */
export type DatosArrepentimientoDuena = Base & {
  email: string
  motivo: string
  pedidoEncontrado: boolean
  emailCoincide: boolean
  urlPanel: string
}

/** Mail al cliente ("Recibimos tu solicitud de arrepentimiento"): constancia y qué sigue. */
export type DatosArrepentimientoCliente = Base & {
  plazoRespuesta: string
  plazoReintegro: string
  urlDevoluciones: string
  /** null mientras el email de contacto sea un marcador sin completar. */
  emailContacto: string | null
  urlWhatsApp: string
  whatsappVisible: string
}
