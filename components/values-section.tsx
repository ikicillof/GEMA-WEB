'use client'

import dynamic from 'next/dynamic'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { invalidateSafe as invalidate } from '@/lib/safe-invalidate'
import { useEffect, useRef, useState } from 'react'
import { VALUES, VALUES_TITLE } from '@/lib/about-data'
import { SectionSquiggles } from './section-squiggles'
import type { Spec } from './squiggles'

// La escena 3D se descarga recién cuando la sección está por entrar en pantalla.
const ValuesScene = dynamic(() => import('./values-scene'), { ssr: false })

// Firuletes en los bordes (el centro lo ocupan el título y los objetos).
const SPECS: Spec[] = [
  { kind: 'loop', x: 0.03, y: 0.1, len: 360, angle: 6, n: 6, amp: 22, color: '#FF4DA6', from: 0, to: 0.5, mobile: true },
  { kind: 'wave', x: 0.62, y: 0.07, len: 280, angle: -3, n: 3, amp: 16, color: '#00E6D2', from: 0.1, to: 0.6, mobile: false },
  { kind: 'coil', x: 0.04, y: 0.94, len: 320, angle: -3, n: 12, amp: 9, color: '#FFD93D', from: 0.3, to: 0.9, mobile: true },
  { kind: 'scribble', x: 0.55, y: 0.95, len: 250, angle: -5, n: 4, amp: 16, color: '#6D28D9', from: 0.4, to: 0.95, mobile: false },
  { kind: 'spiral', x: 0.93, y: 0.12, len: 100, angle: 0, n: 3, amp: 0, color: '#FFD93D', from: 0.2, to: 0.7, mobile: true },
  { kind: 'loop', x: 0.975, y: 0.5, len: 300, angle: 95, n: 6, amp: 16, color: '#FF4DA6', from: 0.35, to: 0.9, mobile: false },
]

export function ValuesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const slots = useRef<(HTMLElement | null)[]>([])
  const kick = useRef<number[]>([])
  const active = useRef(-1)
  const go = useRef(0)
  const [mode, setMode] = useState<{ narrow: boolean; reduced: boolean } | null>(null)
  const [ready, setReady] = useState(false) // el 3D se carga al acercarse
  const [live, setLive] = useState(false) // y solo renderiza mientras la sección está en pantalla
  const [current, setCurrent] = useState(-1) // valor activo (su significado se muestra debajo)

  useEffect(() => { setMode({ narrow: window.matchMedia('(max-width: 700px)').matches, reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches }) }, [])
  useEffect(() => {
    const el = sectionRef.current
    if (!el || !mode) return
    gsap.registerPlugin(ScrollTrigger)
    const lazy = ScrollTrigger.create({ trigger: el, start: 'top bottom+=80%', once: true, onEnter: () => setReady(true) })
    const enter = ScrollTrigger.create({ trigger: el, start: 'top 70%', once: true, onEnter: () => { go.current = performance.now() / 1000; invalidate() } })
    const visible = ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom top', onToggle: self => setLive(self.isActive) })
    return () => { lazy.kill(); enter.kill(); visible.kill() }
  }, [mode])

  // Pasar el mouse, tocar o enfocar con el teclado: el objeto rebota y gira, y debajo aparece qué significa el valor.
  const trigger = (i: number) => {
    active.current = i; setCurrent(i)
    if (!mode?.reduced) kick.current[i] = performance.now() / 1000
    invalidate()
  }

  return <section id="valores" ref={sectionRef} className={`values ${mode?.reduced ? 'values--static' : ''}`} aria-labelledby="valores-title">
    {mode && <SectionSquiggles specs={SPECS} target={sectionRef} reduced={mode.reduced} />}
    {mode && ready && <div className="values-canvas"><ValuesScene slots={slots} kick={kick} active={active} go={go} narrow={mode.narrow} reduced={mode.reduced} live={live} /></div>}
    <div className="shell values-inner">
      <h2 id="valores-title" className="section-title title-inner values-title" data-text={VALUES_TITLE}>{VALUES_TITLE}</h2>
      <ul className="values-list">
        {VALUES.map((v, i) => <li key={v.name} className={`value ${current === i ? 'value--active' : ''}`}>
          <button type="button" ref={el => { slots.current[i] = el }} className="value-slot" aria-label={`${v.name}: ${v.meaning}`} onMouseEnter={() => trigger(i)} onFocus={() => trigger(i)} onClick={() => trigger(i)} />
          <div className="value-copy" aria-hidden="true"><strong style={{ '--c': v.color } as React.CSSProperties}>{v.name}</strong><span>{v.meaning}</span></div>
        </li>)}
      </ul>
    </div>
  </section>
}
