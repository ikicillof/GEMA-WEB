export type Product = {
  slug: string
  name: string
  price: number
  tag: string
  description: string
  detail: string
  colors: string[]
  colorLabel?: string
  images: string[]
  featured?: boolean
}

export const standardColors = [
  { name: 'Rojo', hex: '#EF4444' },
  { name: 'Rosa', hex: '#FF4DA6' },
  { name: 'Fucsia', hex: '#D946EF' },
  { name: 'Violeta', hex: '#6D28D9' },
  { name: 'Azul', hex: '#2563EB' },
  { name: 'Celeste', hex: '#38BDF8' },
  { name: 'Verde', hex: '#22C55E' },
  { name: 'Verde militar', hex: '#556B2F' },
  { name: 'Amarillo', hex: '#FFD93D' },
  { name: 'Naranja', hex: '#F97316' },
  { name: 'Marrón', hex: '#92400E' },
  { name: 'Negro', hex: '#171717' },
  { name: 'Blanco', hex: '#FFFFFF' },
]

export function colorHex(name: string) { return standardColors.find(color => color.name === name)?.hex || (name === 'Gris' ? '#9CA3AF' : '#fff') }

export function formatPrice(value: number) { return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value) }
