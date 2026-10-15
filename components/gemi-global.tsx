'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { colorHex } from '@/lib/products'
import { useCart } from './cart-context'
import { GemiSidekick } from './gemi-sidekick'

type Mood = 'neutral' | 'happy' | 'thinking' | 'laughing' | 'surprised' | 'wink' | 'relaxed'

const phrases = ['Cada rincón merece un poquito de magia', '¿Buscamos tu próximo rincón?', 'Ahora sí quedó lindo', 'Un poquito de color y cambia todo']
const sparkColors = ['#FF4DA6', '#6D28D9', '#00E6D2', '#FFD93D']

export function GemiGlobal() {
  const pathname = usePathname()
  const { items, isOpen, cartPulse } = useCart()
  const [tone, setTone] = useState<'violet' | 'yellow' | 'pink'>('pink')
  const [customColor, setCustomColor] = useState('#FF4DA6')
  const [mood, setMood] = useState<Mood>(items.length ? 'happy' : 'neutral')
  const [cardHover, setCardHover] = useState(false)
  const [bubble, setBubble] = useState('')
  const [override, setOverride] = useState<Mood | null>(null) // expresión que fija una página (p. ej. Quiénes somos); null = la de siempre
  const [storeBottom, setStoreBottom] = useState(96)
  const lastPhrase = useRef(-1)
  const bubbleTimer = useRef<number | null>(null)
  const laughTimer = useRef<number | null>(null)

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const node = document.querySelector<HTMLElement>('.gemi-global')
      if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const rect = node.getBoundingClientRect()
      const x = Math.max(-3, Math.min(3, ((event.clientX - (rect.left + rect.width / 2)) / Math.max(rect.width, 1)) * 3))
      const y = Math.max(-2, Math.min(2, ((event.clientY - (rect.top + rect.height / 2)) / Math.max(rect.height, 1)) * 2))
      node.style.setProperty('--look-x', `${x}px`)
      node.style.setProperty('--look-y', `${y}px`)
    }
    const onProductColor = (event: Event) => {
      const { color, hex } = (event as CustomEvent<{ color?: string; hex?: string }>).detail ?? {}
      if (hex) setCustomColor(hex) // el recorrido del home manda el hex directo (incluye colores de marca fuera de la lista de productos)
      else if (color) setCustomColor(colorHex(color))
    }
    const onCardHover = (event: Event) => {
      const color = (event as CustomEvent<{ color?: string }>).detail?.color
      setCardHover(Boolean(color))
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('gemma-product-color', onProductColor)
    window.addEventListener('gemma-card-hover', onCardHover)
    return () => { window.removeEventListener('pointermove', onPointerMove); window.removeEventListener('gemma-product-color', onProductColor); window.removeEventListener('gemma-card-hover', onCardHover) }
  }, [])

  useEffect(() => {
    setMood(items.length ? 'happy' : isOpen ? 'thinking' : 'neutral')
    if (cartPulse) {
      setMood('happy')
      const timer = window.setTimeout(() => setMood(items.length ? 'happy' : 'thinking'), 1100)
      return () => window.clearTimeout(timer)
    }
  }, [items.length, isOpen, cartPulse])

  useEffect(() => {
    const onMood = (event: Event) => setOverride((event as CustomEvent<{ mood?: Mood | null }>).detail?.mood ?? null)
    window.addEventListener('gemma-gemi-mood', onMood)
    return () => window.removeEventListener('gemma-gemi-mood', onMood)
  }, [])

  useEffect(() => {
    if (pathname.startsWith('/quienes-somos')) { setTone('pink'); setCustomColor('#FF4DA6'); return }
    if (pathname.startsWith('/producto/')) { setTone('violet'); setCustomColor('#00E6D2'); return }
    if (pathname === '/') { setTone('pink'); setCustomColor('#FF4DA6'); return }
    if (pathname === '/tienda') { setTone('violet'); setCustomColor('#6D28D9'); return }
    if (pathname === '/contacto' || pathname.includes('arrepentimiento')) { setTone('pink'); setCustomColor('#FFB4D8'); return }
    setTone('violet'); setCustomColor('#FFFFFF')
  }, [pathname])

  useEffect(() => {
    if (pathname !== '/tienda') { setStoreBottom(96); return }
    const updateStorePosition = () => {
      const gemi = document.querySelector<HTMLElement>('.gemi-global')
      if (!gemi) return
      const gemiRect = gemi.getBoundingClientRect()
      let nextBottom = 96
      document.querySelectorAll<HTMLElement>('.add-mini').forEach(button => {
        const rect = button.getBoundingClientRect()
        const overlaps = gemiRect.right > rect.left && gemiRect.left < rect.right && gemiRect.bottom > rect.top && gemiRect.top < rect.bottom
        if (overlaps) nextBottom = Math.max(nextBottom, window.innerHeight - rect.top + 14)
      })
      setStoreBottom(nextBottom)
    }
    updateStorePosition()
    window.addEventListener('scroll', updateStorePosition, { passive: true })
    window.addEventListener('resize', updateStorePosition)
    return () => { window.removeEventListener('scroll', updateStorePosition); window.removeEventListener('resize', updateStorePosition) }
  }, [pathname])

  const handleTap = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let next = Math.floor(Math.random() * phrases.length)
    if (phrases.length > 1 && next === lastPhrase.current) next = (next + 1) % phrases.length
    lastPhrase.current = next
    setBubble(phrases[next])
    if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current)
    bubbleTimer.current = window.setTimeout(() => setBubble(''), 2000)
    if (reduced) return
    if (laughTimer.current) window.clearTimeout(laughTimer.current)
    setMood('laughing')
    laughTimer.current = window.setTimeout(() => setMood(items.length ? 'happy' : isOpen ? 'thinking' : 'neutral'), 900)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleTap() }
  }
  const effectiveColor = isOpen ? '#FFD93D' : customColor
  const shown = override ?? mood
  const className = ['gemi-global', pathname === '/tienda' ? 'gemi-global--store' : '', isOpen ? 'gemi-global--cart-open' : '', cardHover ? 'gemi-global--card-hover' : '', shown === 'happy' ? 'gemi-global--happy' : '', shown === 'thinking' ? 'gemi-global--thinking' : '', shown === 'laughing' ? 'gemi-global--laughing' : '', bubble ? 'gemi-global--speaking' : ''].filter(Boolean).join(' ')
  return <button type="button" className={className} style={{ '--gemi-fill': effectiveColor, '--store-bottom': `${storeBottom}px` } as React.CSSProperties} aria-label="Gemi" aria-pressed={mood === 'laughing'} onClick={handleTap} onKeyDown={handleKeyDown}><GemiSidekick tone={tone} mood={shown} customColor={effectiveColor} /><span className="gemi-tap-spark gemi-tap-spark--one" style={{ '--spark-color': sparkColors[0] } as React.CSSProperties} /><span className="gemi-tap-spark gemi-tap-spark--two" style={{ '--spark-color': sparkColors[1] } as React.CSSProperties} /><span className="gemi-tap-spark gemi-tap-spark--three" style={{ '--spark-color': sparkColors[2] } as React.CSSProperties} /><span className="gemi-tap-spark gemi-tap-spark--four" style={{ '--spark-color': sparkColors[3] } as React.CSSProperties} />{bubble && <span className="gemi-speech" role="status" aria-live="polite">{bubble}</span>}</button>
}
