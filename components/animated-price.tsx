'use client'

import { useEffect, useRef, useState } from 'react'
import { formatPrice } from '@/lib/products'

const DURATION = 600

// Precio que cuenta hasta el valor nuevo en ~0,6 s, siempre con formato de pesos argentinos.
// Sin animación en el primer render ni con prefers-reduced-motion.
export function AnimatedPrice({ value }: { value: number }) {
  const [shown, setShown] = useState(value)
  const current = useRef(value)
  useEffect(() => {
    if (value === current.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { current.current = value; setShown(value); return }
    const from = current.current, start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION), e = 1 - Math.pow(1 - t, 3)
      current.current = t === 1 ? value : from + (value - from) * e
      setShown(current.current)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <span className="count-price">{formatPrice(Math.round(shown))}</span>
}
