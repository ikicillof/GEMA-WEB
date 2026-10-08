import productsData from '@/data/products.json'
import categoriesData from '@/data/categories.json'
import type { Product, Category } from '@/types/product'

const products = productsData as Product[]
const categories = categoriesData as Category[]

export function getAllProducts(): Product[] {
  return [...products]
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug)
}

export function getProductsByCategory(categorySlug: string): Product[] {
  return products.filter((p) => p.categorySlug === categorySlug)
}

export function getAllCategories(): Category[] {
  return [...categories].sort((a, b) => a.order - b.order)
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug)
}
