// Roles y permisos. Archivo sin secretos: lo pueden importar tanto el servidor como el navegador.
// La fuente de verdad de un rol son los custom claims de Firebase, asignados solo por el servidor.

export const ROLES = ['cliente', 'colaborador', 'admin', 'creador'] as const
export type Rol = (typeof ROLES)[number]

// creador > admin > colaborador > cliente
export const RANGO: Record<Rol, number> = { cliente: 1, colaborador: 2, admin: 3, creador: 4 }

// Permisos que un admin puede habilitarle a un colaborador.
export const PERMISOS_COLABORADOR = ['ventas:ver', 'productos:ver'] as const
export type Permiso = (typeof PERMISOS_COLABORADOR)[number]

export function esRol(valor: unknown): valor is Rol {
  return typeof valor === 'string' && (ROLES as readonly string[]).includes(valor)
}

export function permisosValidos(valor: unknown): Permiso[] {
  if (!Array.isArray(valor)) return []
  return PERMISOS_COLABORADOR.filter(p => valor.includes(p))
}

export const esStaff = (rol: Rol | null | undefined) => !!rol && RANGO[rol] >= RANGO.colaborador
