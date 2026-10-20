'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, ShoppingBag } from 'lucide-react'
import { Product, formatPrice, standardColors } from '@/lib/products'
import { useCart } from './cart-context'

/** `nivel`: nivel del título de la tarjeta. En la tienda (h1 → tarjetas) es h2; dentro de una sección con su propio h2 es h3. */
export function ProductCard({ product, index = 0, nivel: Titulo = 'h3' }: { product: Product; index?: number; nivel?: 'h2' | 'h3' }) {
  const { addItem } = useCart()
  const hasColorChoice = product.colors.length > 0
  const hasSecondPhoto = Boolean(product.images[1])
  const cardClass = `product-card tone-${index % 4} ${product.featured ? 'product-card--featured' : ''} ${hasSecondPhoto ? 'product-card--has-secondary' : ''}`
  const colorNames = product.colors.slice(0, 5)
  return (
    <article className={cardClass} onMouseEnter={() => window.dispatchEvent(new CustomEvent('gemma-card-hover', { detail: { color: product.colors[0] } }))} onMouseLeave={() => window.dispatchEvent(new CustomEvent('gemma-card-hover', { detail: {} }))}>
      <Link href={`/producto/${product.slug}`} className="product-image-wrap group">
        {/* Solo las primeras fotos (lo que se ve sin scrollear) cargan con prioridad; el resto, perezosas. La foto de hover carga cuando haga falta. */}
        <Image src={product.images[0]} alt={product.name} fill priority={index < 4} sizes="(max-width: 768px) 48vw, 24vw" className="product-image product-image--primary" />
        {product.images[1] && <Image src={product.images[1]} alt="" fill sizes="(max-width: 768px) 48vw, 24vw" className="product-image product-image--secondary" />}
        <span className="product-arrow"><ArrowUpRight size={19} /></span>
      </Link>
      <div className="product-card-body">
        <Link href={`/producto/${product.slug}`}><Titulo className="product-name">{product.name}</Titulo></Link>
        <p className="product-price">{formatPrice(product.price)}</p>
        <div className="product-card-meta"><div className="color-dots" aria-label={hasColorChoice ? `Colores: ${product.colors.join(', ')}` : `Color: ${product.colorLabel || 'único'}`}>{hasColorChoice ? <>{colorNames.map(name => { const color = standardColors.find(c => c.name === name)?.hex || (name === 'Gris' ? '#9CA3AF' : '#fff'); return <span key={name} title={name} className="color-dot" style={{ backgroundColor: color }} /> })}{product.colors.length > 5 && <span className="color-more">+{product.colors.length - 5}</span>}</> : <span className="color-fixed">Color: {product.colorLabel || 'único'}</span>}</div><button type="button" className="add-mini" onClick={event => addItem({ slug: product.slug, name: product.name, price: product.price, image: product.images[0], color: product.colors[0] || product.colorLabel || 'Único' }, 1, event.currentTarget)} aria-label={`Agregar ${product.name} al carrito`}><ShoppingBag size={16} /></button></div>
      </div>
    </article>
  )
}
