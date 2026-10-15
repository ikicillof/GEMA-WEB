'use client'

import { useEffect, useRef } from 'react'

export type Flight = { key: number; from: DOMRect; to: DOMRect; image: string; tone: string; commit: () => void }

const SIZE = 56
const DURATION = 720

// Copia de la foto que sale del botón y vuela en arco hasta el ícono del carrito.
// Capa fija, solo transform + opacity; la curva se muestrea en keyframes lineales para que el arco sea suave.
export function FlyToCart({ flight, onDone }: { flight: Flight; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const landed = useRef(false) // compartido entre corridas del efecto (StrictMode) para no sumar dos veces
  useEffect(() => {
    const node = ref.current
    const land = () => { if (landed.current) return; landed.current = true; flight.commit() }
    if (!node || typeof node.animate !== 'function') { land(); onDone(); return }
    const x0 = flight.from.left + flight.from.width / 2 - SIZE / 2, y0 = flight.from.top + flight.from.height / 2 - SIZE / 2
    const x1 = flight.to.left + flight.to.width / 2 - SIZE / 2, y1 = flight.to.top + flight.to.height / 2 - SIZE / 2
    // Punto de control: sube por encima del tramo para formar el arco.
    const cx = (x0 + x1) / 2, cy = Math.min(y0, y1) - 90 - Math.abs(x1 - x0) * 0.12
    const steps = 14
    const frames: Keyframe[] = Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps, e = t * t * (3 - 2 * t), u = 1 - e
      const x = u * u * x0 + 2 * u * e * cx + e * e * x1, y = u * u * y0 + 2 * u * e * cy + e * e * y1
      // Arranca con un "gomita" (se infla un poco) y se achica hasta ~0,3 en el camino.
      const scale = t < 0.12 ? 1 + t * 2 : 1.24 - 0.94 * ((t - 0.12) / 0.88)
      return { transform: `translate3d(${x}px, ${y}px, 0) scale(${scale}) rotate(${t * 18}deg)`, opacity: t > 0.88 ? 1 - (t - 0.88) / 0.12 : 1, offset: t }
    })
    const animation = node.animate(frames, { duration: DURATION, easing: 'linear', fill: 'forwards' })
    // El aterrizaje dispara la reacción un instante antes de que se apague la foto.
    const timer = window.setTimeout(land, DURATION * 0.9)
    animation.finished.then(() => { land(); onDone() }, () => {})
    return () => { window.clearTimeout(timer); animation.cancel() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <div ref={ref} className="fly-to-cart" aria-hidden="true" style={{ background: flight.tone }}><img src={flight.image} alt="" draggable={false} /></div>
}
