'use client'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useRef, useState } from 'react'
import { STORY } from '@/lib/about-data'
import { GemiSidekick } from './gemi-sidekick'
import { easeInOutSine, getLenis } from './smooth-scroll'
import { Squiggles, drawSquiggles } from './squiggles'
import type { Spec } from './squiggles'
import { StatsSection } from './stats-section'
import { StoryIllustration } from './story-art'
import { ValuesSection } from './values-section'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const ease = (t: number) => t * t * (3 - 2 * t)
const SCRUB = 1.5 // las animaciones siguen al scroll con retardo: más lentas y suaves, como en el home

// Línea de tiempo de la historia (p de 0 a 1 sobre el tramo fijo): Gemi viaja al costado, un globo por parada, Gemi vuelve a su esquina.
const TRAVEL_IN = 0.08 // 0 → 0,08: Gemi viaja desde su esquina hasta el costado izquierdo
const BUBBLE_AT = STORY.map((_, i) => 0.12 + i * 0.16) // centro de cada globo (también es la parada del snap)
const HALF = 0.075, FADE = 0.03 // cada globo está visible ±HALF alrededor de su centro, con fundidos de FADE
const TRAVEL_OUT = [0.86, 0.94] // Gemi vuelve a su esquina
const bubbleOpacity = (p: number, i: number) => clamp01((p - (BUBBLE_AT[i] - HALF)) / FADE) * clamp01((BUBBLE_AT[i] + HALF - p) / FADE)

// Firuletes de la historia: en los bordes, sin pasar por Gemi (izquierda), el globo (centro) ni la ilustración (derecha).
const SPECS: Spec[] = [
  { kind: 'loop', x: 0.3, y: 0.13, len: 340, angle: 3, n: 6, amp: 20, color: '#00E6D2', from: 0.02, to: 0.45, mobile: true },
  { kind: 'wave', x: 0.62, y: 0.12, len: 280, angle: -3, n: 3, amp: 16, color: '#6D28D9', from: 0.3, to: 0.75, mobile: false },
  { kind: 'coil', x: 0.3, y: 0.93, len: 330, angle: -3, n: 12, amp: 9, color: '#FFD93D', from: 0.1, to: 0.6, mobile: true },
  { kind: 'scribble', x: 0.62, y: 0.93, len: 250, angle: -4, n: 4, amp: 16, color: '#FF4DA6', from: 0.45, to: 0.95, mobile: false },
  { kind: 'wave', x: 0.975, y: 0.22, len: 300, angle: 95, n: 5, amp: 13, color: '#FFD93D', from: 0.2, to: 0.7, mobile: true },
  { kind: 'spiral', x: 0.05, y: 0.12, len: 90, angle: 0, n: 3, amp: 0, color: '#FF4DA6', from: 0, to: 0.5, mobile: false },
  { kind: 'spiral', x: 0.93, y: 0.9, len: 100, angle: 0, n: 3, amp: 0, color: '#6D28D9', from: 0.5, to: 1, mobile: false },
]

export function AboutPage() {
  const storyRef = useRef<HTMLElement>(null)
  const introRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLDivElement>(null)
  const bubbles = useRef<(HTMLDivElement | null)[]>([])
  const arts = useRef<(HTMLDivElement | null)[]>([])
  const paths = useRef<(SVGPathElement | null)[]>([])
  const [mode, setMode] = useState<{ narrow: boolean; reduced: boolean } | null>(null)
  const [size, setSize] = useState({ w: 1000, h: 600 })
  const [active, setActive] = useState(0) // globo visible (para lectores de pantalla)

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    onResize(); window.addEventListener('resize', onResize)
    setMode({ narrow: window.matchMedia('(max-width: 700px)').matches, reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches })
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // El degradado crema va en el body (fijo en pantalla), como en el home: las secciones son transparentes.
  useEffect(() => {
    const b = document.body.style
    b.background = 'var(--fondo-gemma)'; b.backgroundAttachment = 'fixed'
    return () => { b.background = ''; b.backgroundAttachment = '' }
  }, [])

  useEffect(() => {
    const story = storyRef.current
    if (!story || !mode || mode.reduced) return
    const { narrow } = mode
    gsap.registerPlugin(ScrollTrigger)
    const gemi = () => document.querySelector<HTMLElement>('.gemi-global')
    const setMood = (mood: string | null) => window.dispatchEvent(new CustomEvent('gemma-gemi-mood', { detail: { mood } }))
    let lastIdx = -1

    const paint = (p: number) => {
      if (introRef.current) introRef.current.style.opacity = String(1 - ease(clamp01((p - 0.01) / 0.05)))
      // Un globo y su ilustración por vez, con fundido; la expresión de Gemi cambia cuando aparece el globo.
      let idx = -1
      STORY.forEach((_, i) => {
        const o = bubbleOpacity(p, i), b = bubbles.current[i], a = arts.current[i]
        if (b) { b.style.opacity = String(o); b.style.transform = `translateY(${(1 - o) * 16}px) scale(${0.95 + 0.05 * o})` }
        if (a) { a.style.opacity = String(o); a.style.transform = `translateX(${(1 - o) * 40}px) scale(${0.94 + 0.06 * o})` }
        if (o > 0.5) idx = i
      })
      if (idx < 0 && p > TRAVEL_IN + 0.01 && p < TRAVEL_OUT[0]) idx = lastIdx // entre dos globos conserva la expresión
      if (idx !== lastIdx) { lastIdx = idx; setMood(idx < 0 ? null : STORY[idx].mood); if (idx >= 0) setActive(idx) }
      drawSquiggles(paths.current, SPECS, p, false)

      // Gemi fijo: de su esquina al costado izquierdo, y de vuelta al terminar (misma técnica que el logo del home).
      const g = gemi(), box = targetRef.current
      if (!g || !box) return
      const k = ease(clamp01(p / TRAVEL_IN)) * (1 - ease(clamp01((p - TRAVEL_OUT[0]) / (TRAVEL_OUT[1] - TRAVEL_OUT[0]))))
      if (k <= 0) { g.style.translate = ''; g.style.scale = ''; return }
      g.style.translate = 'none'; g.style.scale = 'none'
      const r = g.getBoundingClientRect(), t = box.getBoundingClientRect()
      g.style.translate = `${(t.left + t.width / 2 - (r.left + r.width / 2)) * k}px ${(t.top + t.height / 2 - (r.top + r.height / 2)) * k}px`
      g.style.scale = String(1 + (t.height / r.height - 1) * k)
    }

    const state = { p: 0 }
    const ctx = gsap.context(() => {
      gsap.to(state, { p: 1, ease: 'none', onUpdate: () => paint(state.p), scrollTrigger: { trigger: story, start: 'top top', end: 'bottom bottom', scrub: SCRUB, invalidateOnRefresh: true } })
    })
    paint(0)

    // Snap sobre Lenis, como en el home: con el scroll quieto ≈200 ms la página se desliza sola a la parada siguiente en la
    // dirección del gesto (el título, cada globo, "Lo que nos mueve" y "Gemma en números"). Saltos lentos; el footer queda libre.
    const top = () => story.getBoundingClientRect().top + window.scrollY
    const run = () => story.offsetHeight - window.innerHeight
    const topOf = (id: string) => { const el = document.getElementById(id); return el ? el.getBoundingClientRect().top + window.scrollY : null }
    const stops = () => [top(), ...BUBBLE_AT.map(f => top() + run() * f), topOf('valores'), topOf('numeros')].filter((y): y is number => y !== null)
    let dir = 1, lastY = window.scrollY, idle = 0, snapping = false, touching = false
    const settle = () => {
      const lenis = getLenis(), y = window.scrollY
      if (!lenis || snapping || touching) return
      const S = stops()
      if (y > S[S.length - 1] + 2 && dir > 0) return // pasado el último momento importante (el footer) no se interviene
      const to = dir > 0 ? S.find(s => s >= y - 2) : [...S].reverse().find(s => s <= y + 2)
      if (to === undefined || Math.abs(to - y) < 2) return
      snapping = true
      const d = Math.abs(to - y) / window.innerHeight, seconds = Math.min(2, Math.max(1.2, 0.9 + 0.55 * d))
      lenis.scrollTo(to, { duration: narrow ? seconds * 0.8 : seconds, easing: easeInOutSine, onComplete: () => { snapping = false } })
    }
    const onScroll = () => {
      const y = window.scrollY, dy = y - lastY
      if (dy && !snapping) dir = dy > 0 ? 1 : -1
      lastY = y
      window.clearTimeout(idle); idle = window.setTimeout(settle, 200)
    }
    // Si el usuario vuelve a scrollear durante el deslizamiento, se cancela al instante y el control vuelve a él.
    const cancel = () => { if (!snapping) return; snapping = false; getLenis()?.scrollTo(window.scrollY, { immediate: true, force: true }) }
    const onTouchStart = () => { touching = true; cancel() }
    const onTouchEnd = () => { touching = false; window.clearTimeout(idle); idle = window.setTimeout(settle, 200) }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('wheel', cancel, { capture: true, passive: true })
    window.addEventListener('keydown', cancel, { capture: true })
    window.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      ctx.revert(); window.clearTimeout(idle)
      window.removeEventListener('scroll', onScroll); window.removeEventListener('wheel', cancel, { capture: true }); window.removeEventListener('keydown', cancel, { capture: true })
      window.removeEventListener('touchstart', onTouchStart, { capture: true }); window.removeEventListener('touchend', onTouchEnd)
      const g = gemi(); if (g) { g.style.translate = ''; g.style.scale = '' }
      setMood(null)
    }
  }, [mode])

  return <>
    {mode?.reduced
      // Con movimiento reducido: todos los globos y textos visibles, sin animación (Gemi queda en su esquina).
      ? <section className="story story--static" aria-label="Gemi cuenta la historia de Gemma">
        <h1 className="section-title title-inner story-title" data-text="Quiénes somos">Quiénes somos</h1>
        <ol className="story-static-list">{STORY.map((s, i) => <li key={i} className="story-static-item">
          <div className="story-static-gemi"><GemiSidekick tone="pink" mood={s.mood} customColor="#FF4DA6" /></div>
          <p className="story-bubble story-bubble--static">{s.text}</p>
          <div className="story-static-art"><StoryIllustration art={s.art} /></div>
        </li>)}</ol>
      </section>
      : <section ref={storyRef} className="story" aria-label="Gemi cuenta la historia de Gemma">
        <div className="story-sticky">
          <Squiggles specs={SPECS} size={size} paths={paths} />
          <div ref={introRef} className="story-intro"><h1 className="section-title title-inner story-title" data-text="Quiénes somos">Quiénes somos</h1><p className="story-hint">Scrolleá y conocé a Gemi</p></div>
          <div ref={targetRef} className="story-gemi-target" aria-hidden="true" />
          {STORY.map((s, i) => <div key={i} className="story-bubble-wrap"><div ref={el => { bubbles.current[i] = el }} className="story-bubble" aria-hidden="true">{s.text}</div></div>)}
          <div className="story-art">{STORY.map((s, i) => <div key={i} ref={el => { arts.current[i] = el }} className="story-art-item" aria-hidden="true"><StoryIllustration art={s.art} /></div>)}</div>
          <p className="sr-only" aria-live="polite">{STORY[active].text}</p>
        </div>
      </section>}
    <ValuesSection />
    <StatsSection />
  </>
}
