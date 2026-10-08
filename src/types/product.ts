export type ColorVariant = {
  name: string
  hex: string
  photo?: string
  available: boolean
}

export type Product = {
  id: string
  slug: string
  name: string
  description: string
  categorySlug: string
  price: number
  colors: ColorVariant[]
  photos: string[]
  available: boolean
  model3d?: string
}

export type Category = {
  slug: string
  name: string
  order: number
}
