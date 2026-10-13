'use client'

import Image from 'next/image'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { invalidate } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import type { HeroDoorProgress } from './hero-door-scene'

// Puerta corrediza 3D del hero (lo primero que se ve: se carga apenas monta la página).
const HeroDoorScene = dynamic(() => import('./hero-door-scene'), { ssr: false })

export function GemmaExperience() {
  const stageRef = useRef<HTMLElement>(null)
  const artRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const gemiRef = useRef<HTMLDivElement>(null)
  const doorProgress = useRef<HeroDoorProgress>({ open: 0, dolly: 0 })
  const [narrow, setNarrow] = useState<boolean | null>(null)

  useEffect(() => {
    const stage = stageRef.current
    const art = artRef.current
    const content = contentRef.current
    const gemi = gemiRef.current
    if (!stage || !art || !content || !gemi) return
    setNarrow(window.matchMedia('(max-width: 700px)').matches)

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const onPointerMove = (event: PointerEvent) => { const rect = gemi.getBoundingClientRect(); const x = Math.max(-3, Math.min(3, ((event.clientX - (rect.left + rect.width / 2)) / Math.max(rect.width, 1)) * 3)); const y = Math.max(-2, Math.min(2, ((event.clientY - (rect.top + rect.height / 2)) / Math.max(rect.height, 1)) * 2)); gemi.style.setProperty('--look-x', `${x}px`); gemi.style.setProperty('--look-y', `${y}px`) }
    if (!reduced) window.addEventListener('pointermove', onPointerMove, { passive: true })
    gsap.registerPlugin(ScrollTrigger)
    if (reduced) {
      // Con movimiento reducido la puerta ya está abierta y la cámara quieta.
      doorProgress.current.open = 1; invalidate()
      gemi.classList.add('portal-gemi--still')
      return
    }

    const featured = document.querySelector('#destacados')
    const contact = document.querySelector('.contact-block')
    const door = doorProgress.current
    const lightwash = stage.querySelector<HTMLElement>('.portal-lightwash'), wash = { v: 0 }
    const ctx = gsap.context(() => {
      // La animación dura exactamente lo que dura el tramo fijo (sticky) de la sección:
      // empieza cuando el hero toca el borde superior y termina cuando la sección se libera.
      const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: stage,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.5, // mismo retardo que el resto del home: la apertura de la puerta se mueve lenta y suave
          invalidateOnRefresh: true,
          onUpdate: self => gemi.classList.toggle('portal-gemi--companion', self.progress > .96),
        },
      })
      // Escala de tiempo 0 → 1 = recorrido completo del scroll fijo.
      // Las hojas se deslizan hacia los costados (0 → 0,5); ya abiertas, la cámara avanza y atraviesa el paso
      // (0,5 → 0,92) mientras la luz llena la pantalla hasta el crema de la sección 1.
      timeline
        .to(door, { open: 1, duration: 0.5, ease: 'power1.inOut', onUpdate: () => invalidate() }, 0)
        .to(door, { dolly: 1, duration: 0.42, ease: 'power1.in', onUpdate: () => invalidate() }, 0.5)
        .to(gemi, { x: 38, y: -14, scale: 0.94, rotate: 16, duration: 0.4 }, 0.2)
        .to(content.querySelectorAll('.portal-copy, .portal-note, .portal-scroll-cue'), { opacity: 0, duration: 0.2 }, 0.45)
        // Cuando la cámara está por atravesar el paso (cruza ≈ 0,87), la luz nace del centro de la pantalla —donde está
        // el paso— y se expande con un borde muy difuso hasta llenarla y fundirse con el crema de la sección 1.
        .fromTo(wash, { v: 0 }, { v: 1, duration: 0.1, ease: 'power1.in', onUpdate: () => lightwash?.style.setProperty('--wash', String(wash.v)) }, 0.8)
        .to(stage, { backgroundColor: '#FFF9F5', duration: 0.04 }, 0.92)
      if (featured) ScrollTrigger.create({ trigger: featured, start: 'top 70%', end: 'bottom 30%', onEnter: () => { gemi.classList.add('portal-gemi--featured'); gemi.classList.remove('portal-gemi--contact') }, onEnterBack: () => { gemi.classList.add('portal-gemi--featured'); gemi.classList.remove('portal-gemi--contact') }, onLeaveBack: () => gemi.classList.remove('portal-gemi--featured') })
      if (contact) ScrollTrigger.create({ trigger: contact, start: 'top 72%', end: 'bottom 25%', onEnter: () => { gemi.classList.add('portal-gemi--contact'); gemi.classList.remove('portal-gemi--featured') }, onEnterBack: () => { gemi.classList.add('portal-gemi--contact'); gemi.classList.remove('portal-gemi--featured') }, onLeaveBack: () => gemi.classList.remove('portal-gemi--contact') })
    }, stage)
    return () => { ctx.revert(); window.removeEventListener('pointermove', onPointerMove) }
  }, [])

  return <section ref={stageRef} className="portal-stage portal-stage--flat">
    <div className="portal-sticky"><div className="portal-lightwash" aria-hidden="true" />
      {narrow !== null && <div className="portal-door3d" aria-hidden="true"><HeroDoorScene progress={doorProgress} anchor={artRef} narrow={narrow} /></div>}
      <div className="portal-content hero" ref={contentRef}>
        <div className="shell portal-hero-grid">
          <div className="portal-copy">
            <p className="hero-kicker"><span /> Objetos con personalidad</p>
            <Image className="portal-logo" src="/productos/logo-transparent.png" alt="Gemma" width={466} height={275} priority />
            <p className="portal-tagline">Hacemos que cada rincón <em>brille.</em></p>
            <p className="hero-lead">Diseños impresos en 3D, hechos a pedido y llenos de color. Para que tu casa se sienta un poquito más vos.</p>
            <div className="hero-actions"><Link href="/tienda" className="button button--pink">Ver la tienda <span aria-hidden="true">→</span></Link><a href="#quienes-somos" className="button button--outline">Conocer Gemma</a></div>
          </div>
          {/* Columna de la puerta: la puerta 3D (canvas de fondo) se ubica midiendo esta caja. */}
          <div className="portal-art" ref={artRef} aria-hidden="true">
            <div className="portal-gemi" ref={gemiRef}><svg viewBox="0 0 100 116" role="img" aria-label="Gemi, la gema de Gemma"><defs><linearGradient id="gemiPink" x1="14" y1="8" x2="82" y2="104" gradientUnits="userSpaceOnUse"><stop stopColor="#FFB4DB"/><stop offset=".35" stopColor="#FF4DA6"/><stop offset="1" stopColor="#D62983"/></linearGradient></defs><path d="M50 5 89 31 80 84 50 111 20 84 11 31 50 5Z" fill="var(--gemi-fill, url(#gemiPink))" stroke="#FFB4DB" strokeWidth="3"/><path d="m50 5 9 31-9 75-30-27 30-48Z" fill="#FF83C2" opacity=".42"/><path d="m50 5-9 31 9 75 30-27-30-48Z" fill="#C12578" opacity=".33"/><path d="m11 31 30 5 9-31M89 31l-30 5M20 84l30-48 30 48" fill="none" stroke="#FFDAEF" strokeWidth="2" opacity=".72"/><g className="gemi-eyes"><ellipse cx="38" cy="58" rx="4" ry="7" fill="#6D28D9"/><ellipse cx="62" cy="58" rx="4" ry="7" fill="#6D28D9"/><ellipse cx="27" cy="72" rx="7" ry="3" fill="#6D28D9" opacity=".7"/><ellipse cx="73" cy="72" rx="7" ry="3" fill="#6D28D9" opacity=".7"/></g><path className="gemi-mouth" d="M39 79 Q50 91 61 79" fill="none" stroke="#6D28D9" strokeWidth="3" strokeLinecap="round"/></svg></div>
            <div className="portal-note">Gemi abre la puerta a un rincón más lindo.</div>
          </div>
        </div>
        <div className="portal-scroll-cue"><span className="portal-scroll-line" /> bajá para entrar</div>
      </div>
    </div>
  </section>
}
