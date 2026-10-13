'use client'

import dynamic from 'next/dynamic'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { invalidate } from '@react-three/fiber'
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { MutableRefObject, RefObject } from 'react'
import { PJ } from '@/lib/printer-timeline'
import { colorHex, products } from '@/lib/products'
import { Squiggles, drawSquiggles } from './squiggles'
import type { Spec } from './squiggles'

// Sección 2 del home: la impresora 3D. Este componente es el contenido fijo de la sección (escena, firuletes, textos y menú
// de colores); el home le da el progreso (paint) desde su propio ScrollTrigger y maneja el snap de todo el recorrido.
// La escena 3D se descarga recién cuando la sección está por entrar en pantalla.
const PrinterScene = dynamic(() => import('./printer-scene'), { ssr: false })

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
// Firuletes en los bordes: no cruzan el texto (izquierda, al medio) ni el centro-derecha, donde está la impresora.
const SPECS: Spec[] = [
  { kind: 'loop', x: 0.04, y: 0.17, len: 340, angle: 6, n: 6, amp: 22, color: '#00E6D2', from: 0, to: 0.4, mobile: true },
  { kind: 'wave', x: 0.42, y: 0.15, len: 260, angle: -4, n: 3, amp: 16, color: '#6D28D9', from: 0.08, to: 0.5, mobile: false },
  { kind: 'coil', x: 0.05, y: 0.92, len: 330, angle: -3, n: 12, amp: 9, color: '#FFD93D', from: 0.15, to: 0.65, mobile: true },
  { kind: 'scribble', x: 0.5, y: 0.93, len: 250, angle: -5, n: 4, amp: 16, color: '#FF4DA6', from: 0.35, to: 0.85, mobile: false },
  { kind: 'loop', x: 0.975, y: 0.3, len: 300, angle: 95, n: 6, amp: 16, color: '#00E6D2', from: 0.3, to: 0.8, mobile: true },
  { kind: 'wave', x: 0.02, y: 0.35, len: 280, angle: 82, n: 5, amp: 12, color: '#FFD93D', from: 0.2, to: 0.7, mobile: true },
  { kind: 'spiral', x: 0.08, y: 0.27, len: 90, angle: 0, n: 3, amp: 0, color: '#6D28D9', from: 0.1, to: 0.55, mobile: false },
  { kind: 'spiral', x: 0.62, y: 0.12, len: 100, angle: 0, n: 3, amp: 0, color: '#FF4DA6', from: 0.5, to: 1, mobile: false },
]
const TEXTS = [
  <>Elegí <em>tu color</em></>,
  <>Capa por capa, <em>como si fuera magia</em></>,
  <>Hecho a pedido, <em>en tu color</em></>,
]

// paint(p, exit): p = progreso de la animación (0 → 1); exit = progreso del tramo de salida (0 → 1), que se superpone con la
// entrada del cuarto de la sección 3: ahí toda la escena se desvanece para que el cuarto entre sobre un fondo vacío.
export type PrinterApi = { paint: (p: number, exit?: number) => void }
type Props = { section: RefObject<HTMLElement>; mode: { narrow: boolean; reduced: boolean }; size: { w: number; h: number }; dogColor: MutableRefObject<string> }

export const PrinterStage = forwardRef<PrinterApi, Props>(function PrinterStage({ section, mode, size, dogColor }, ref) {
  const { narrow, reduced } = mode
  const textRefs = useRef<(HTMLParagraphElement | null)[]>([])
  const menuRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const paths = useRef<(SVGPathElement | null)[]>([])
  const progress = useRef(reduced ? 1 : 0)
  const [ready, setReady] = useState(false) // la escena se carga al acercarse
  const [live, setLive] = useState(false) // el render corre solo mientras la sección está en pantalla
  // Los colores del Perro Globo, los de su lista en el catálogo.
  const palette = useMemo(() => (products.find(p => p.slug === 'perro-globo')?.colors ?? []).map(name => ({ name, hex: colorHex(name) })), [])
  const [selected, setSelected] = useState(() => Math.max(0, palette.findIndex(c => c.hex.toLowerCase() === dogColor.current.toLowerCase())))

  const choose = (i: number) => {
    setSelected(i); dogColor.current = palette[i].hex
    invalidate() // con movimiento reducido no hay cuadros continuos: se redibuja el perro (y el del cuarto) al instante
  }

  useImperativeHandle(ref, () => ({
    paint: (p: number, exit = 0) => {
      progress.current = p
      const gone = clamp01(exit * 1.5) // se va entera antes de que el cuarto termine de entrar
      if (canvasRef.current) canvasRef.current.style.opacity = String(1 - gone)
      PJ.TEXTS.forEach(([a, b, c, d], i) => {
        const el = textRefs.current[i]
        if (el) el.style.opacity = String(clamp01((p - a) / (b - a)) * clamp01((d - p) / (d - c)) * (1 - gone))
      })
      // El menú comparte ventana con el primer texto: se desvanece al ir hacia la boquilla (el color queda fijado) y reaparece al subir.
      const menu = menuRef.current
      if (menu) {
        const [a, b, c, d] = PJ.TEXTS[0], o = clamp01((p - a) / (b - a)) * clamp01((d - p) / (d - c))
        menu.style.opacity = String(o); menu.style.pointerEvents = o > 0.5 ? 'auto' : 'none'; menu.inert = o <= 0.5
      }
      drawSquiggles(paths.current, SPECS, p, false)
      if (menu) menu.style.opacity = String(Number(menu.style.opacity) * (1 - gone))
      invalidate()
    },
  }), [])

  useEffect(() => {
    const el = section.current
    if (!el) return
    gsap.registerPlugin(ScrollTrigger)
    const lazy = ScrollTrigger.create({ trigger: el, start: 'top bottom+=100%', once: true, onEnter: () => setReady(true) })
    const visible = ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom top', onToggle: self => setLive(self.isActive) })
    if (reduced) { setReady(true); drawSquiggles(paths.current, SPECS, 0.5, true) } // sin animación: todo visible, pieza terminada
    return () => { lazy.kill(); visible.kill() }
  }, [section, reduced])

  return <div className={`journey-sticky pj-sticky ${reduced ? 'pj-sticky--static' : ''}`}>
    {ready && <div ref={canvasRef} className="journey-canvas"><PrinterScene progress={progress} color={dogColor} narrow={narrow} reduced={reduced} live={live} /></div>}
    <Squiggles specs={SPECS} size={size} paths={paths} />
    <div className="pj-texts">
      <p ref={el => { textRefs.current[0] = el }} className="journey-text pj-text">{TEXTS[0]}</p>
      {/* Menú de colores (los del Perro Globo): botones accesibles, con el nombre del color y usables con el teclado. */}
      <div ref={menuRef} className="pj-colors" role="group" aria-label="Color del Perro Globo" style={reduced ? undefined : { opacity: 0, pointerEvents: 'none' }}>
        <div className="pj-color-list">
          {palette.map((c, i) => <button type="button" key={c.name} className={`pj-color ${selected === i ? 'pj-color--active' : ''}`} onClick={() => choose(i)} aria-label={c.name} aria-pressed={selected === i} style={{ '--dot': c.hex } as React.CSSProperties}><span className="pj-color-dot" /></button>)}
        </div>
        <p className="pj-color-name" aria-live="polite">{palette[selected]?.name}</p>
      </div>
      <p ref={el => { textRefs.current[1] = el }} className="journey-text pj-text">{TEXTS[1]}</p>
      <p ref={el => { textRefs.current[2] = el }} className="journey-text pj-text">{TEXTS[2]}</p>
    </div>
  </div>
})
