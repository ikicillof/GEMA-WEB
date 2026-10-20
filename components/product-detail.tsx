'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Check, Minus, Plus, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { Product, formatPrice, standardColors } from '@/lib/products'
import { useCart } from './cart-context'
import { GemmaStar } from './gemma-ornament'

export function ProductDetail({ product }: { product: Product }) {
  const { addItem } = useCart()
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedColor, setSelectedColor] = useState(product.colors[0] || 'Único')
  const selectColor = (color: string) => { setSelectedColor(color); window.dispatchEvent(new CustomEvent('gemma-product-color', { detail: { color } })) }
  const [quantity, setQuantity] = useState(1)
  const hasColorChoice = product.colors.length > 0
  const colorHex = (name: string) => standardColors.find(color => color.name === name)?.hex || (name === 'Gris' ? '#9CA3AF' : '#fff')
  return <div className="product-layout"><div><div className="gallery-main" style={{ '--gallery-tone': colorHex(selectedColor) } as React.CSSProperties}>{hasColorChoice && <div className="gallery-color-wash" aria-hidden="true" />}<Image src={product.images[selectedImage]} alt={product.name} fill sizes="(max-width: 700px) 100vw, 55vw" priority /></div><div className="gallery-strip">{product.images.map((image, index) => <button type="button" key={image} className="gallery-thumb" onClick={() => setSelectedImage(index)} aria-label={`Ver imagen ${index + 1} de ${product.name}`} style={{ borderColor: selectedImage === index ? '#FF4DA6' : 'transparent' }}><Image src={image} alt={`${product.name}, vista ${index + 1}`} fill sizes="100px" /></button>)}</div></div><div className="product-detail"><p className="eyebrow">{product.tag}</p><h1>{product.name}</h1><p className="detail-price">{formatPrice(product.price)}</p><p className="detail-copy">{product.description} {product.detail}</p><div className="made-badge"><Check size={15} /> Hecho a pedido</div>{hasColorChoice ? <><label className="option-label">Elegí tu color: <span style={{ color:'#6D28D9' }}>{selectedColor}</span></label><div className="detail-color-list">{product.colors.map(color => <button type="button" key={color} className={`detail-color ${selectedColor === color ? 'detail-color--active' : ''}`} onClick={() => selectColor(color)}><span className="detail-color-dot" style={{ background: colorHex(color) }} />{color}</button>)}</div></> : <p className="fixed-color-label">Color: {product.colorLabel || 'único'}</p>}<label className="option-label">Cantidad</label><div className="detail-actions"><div className="detail-quantity"><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Restar cantidad"><Minus size={15} /></button><strong>{quantity}</strong><button type="button" onClick={() => setQuantity(quantity + 1)} aria-label="Sumar cantidad"><Plus size={15} /></button></div><button type="button" className="button button--pink" onClick={event => addItem({ slug: product.slug, name: product.name, price: product.price, image: product.images[0], color: hasColorChoice ? selectedColor : (product.colorLabel || 'Único') }, quantity, event.currentTarget)}><ShoppingBag size={17} /> Agregar al carrito</button></div><p className="detail-note"><span className="detail-star"><GemmaStar size={14} /></span> Fabricamos tu pieza en 7 a 14 días hábiles. Si necesitás otro color o tenés una consulta, escribinos por WhatsApp.</p></div></div>
}
