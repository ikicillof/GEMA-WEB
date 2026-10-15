'use client'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useRef, useState } from 'react'
import { STATS, STATS_TITLE } from '@/lib/about-data'
import { GemmaStar } from './gemma-ornament'
import { SectionSquiggles } from './section-squiggles'
import type { Spec } from './squiggles'

const COUNT_MS = 1800 // lo que tarda cada contador en llegar a su valor
const STAGGER_MS = 160 // un contador arranca un poco después del anterior
const fmt = new Intl.NumberFormat('es-AR')

const SPECS: Spec[] = [
  { kind: 'wave', x: 0.04, y: 0.1, len: 300, angle: 4, n: 4, amp: 14, color: '#6D28D9', from: 0, to: 0.5, mobile: true },
  { kind: 'loop', x: 0.6, y: 0.08, len: 340, angle: -4, n: 6, amp: 20, color: '#FFD93D', from: 0.1, to: 0.6, mobile: false },
  { kind: 'scribble', x: 0.05, y: 0.94, len: 260, angle: -4, n: 4, amp: 16, color: '#00E6D2', from: 0.3, to: 0.85, mobile: true },
  { kind: 'coil', x: 0.55, y: 0.95, len: 320, angle: 3, n: 12, amp: 9, color: '#FF4DA6', from: 0.4, to: 0.95, mobile: false },
  { kind: 'spiral', x: 0.94, y: 0.14, len: 100, angle: 0, n: 3, amp: 0, color: '#00E6D2', from: 0.2, to: 0.7, mobile: true },
]

export function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [reduced, setReduced] = useState<boolean | null>(null)
  const [values, setValues] = useState(STATS.map(() => 0))
  const [done, setDone] = useState(STATS.map(() => false))

  useEffect(() => { setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches) }, [])
  useEffect(() => {
    const el = sectionRef.current
    if (!el || reduced === null) return
    // Con movimiento reducido, los números ya están en su valor final.
    if (reduced) { setValues(STATS.map(s => s.value)); setDone(STATS.map(() => true)); return }
    gsap.registerPlugin(ScrollTrigger)
    let raf = 0
    const start = () => {
      const t0 = performance.now(), finished = STATS.map(() => false)
      const step = (now: number) => {
        let all = true
        const next = STATS.map((s, i) => {
          const k = Math.min(1, Math.max(0, (now - t0 - i * STAGGER_MS) / COUNT_MS))
          if (k < 1) all = false; else if (!finished[i]) { finished[i] = true; setDone(d => d.map((v, j) => (j === i ? true : v))) }
          return Math.round(s.value * (1 - Math.pow(1 - k, 3)))
        })
        setValues(next)
        if (!all) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }
    const st = ScrollTrigger.create({ trigger: el, start: 'top 65%', once: true, onEnter: start }) // al entrar en pantalla
    return () => { st.kill(); cancelAnimationFrame(raf) }
  }, [reduced])

  return <section id="numeros" ref={sectionRef} className="stats" aria-labelledby="numeros-title">
    {reduced !== null && <SectionSquiggles specs={SPECS} target={sectionRef} reduced={reduced} />}
    <div className="shell stats-inner">
      <h2 id="numeros-title" className="section-title title-inner stats-title" data-text={STATS_TITLE}>{STATS_TITLE}</h2>
      <ul className="stats-list">
        {STATS.map((s, i) => <li key={s.label} className={`stat ${done[i] ? 'stat--done' : ''}`} style={{ '--c': s.color } as React.CSSProperties}>
          <div className="stat-top">
            <span className="stat-number" aria-label={`${fmt.format(s.value)}${s.suffix}`}><span className="title-inner" data-text={`${fmt.format(values[i])}${s.suffix}`} aria-hidden="true">{fmt.format(values[i])}{s.suffix}</span></span>
            <span className="stat-spark" aria-hidden="true"><GemmaStar size={30} /></span>
          </div>
          <p className="stat-label">{s.label}</p>
        </li>)}
      </ul>
    </div>
  </section>
}
