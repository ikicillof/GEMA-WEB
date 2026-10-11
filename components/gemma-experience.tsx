'use client'

import Image from 'next/image'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useRef } from 'react'

export function GemmaExperience() {
  const stageRef = useRef<HTMLElement>(null)
  const leavesRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const gemiRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stage = stageRef.current
    const leaves = leavesRef.current
    const content = contentRef.current
    const gemi = gemiRef.current
    if (!stage || !leaves || !content || !gemi) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const onPointerMove = (event: PointerEvent) => { const rect = gemi.getBoundingClientRect(); const x = Math.max(-3, Math.min(3, ((event.clientX - (rect.left + rect.width / 2)) / Math.max(rect.width, 1)) * 3)); const y = Math.max(-2, Math.min(2, ((event.clientY - (rect.top + rect.height / 2)) / Math.max(rect.height, 1)) * 2)); gemi.style.setProperty('--look-x', `${x}px`); gemi.style.setProperty('--look-y', `${y}px`) }
    if (!reduced) window.addEventListener('pointermove', onPointerMove, { passive: true })
    gsap.registerPlugin(ScrollTrigger)
    if (reduced) {
      leaves.classList.add('portal-leaves--open')
      gemi.classList.add('portal-gemi--still')
      return
    }

    const featured = document.querySelector('#destacados')
    const contact = document.querySelector('.contact-block')
    // Centro de la puerta relativo a la pantalla: desde ahí crece la luz.
    const doorCenter = () => { const sticky = stage.querySelector('.portal-sticky') as HTMLElement; const base = sticky.getBoundingClientRect(); const r = leaves.getBoundingClientRect(); return `${Math.round(r.left - base.left + r.width / 2)}px ${Math.round(r.top - base.top + r.height * 0.6)}px` }
    const ctx = gsap.context(() => {
      // La animación dura exactamente lo que dura el tramo fijo (sticky) de la sección:
      // empieza cuando el hero toca el borde superior y termina cuando la sección se libera.
      const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: stage,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: self => gemi.classList.toggle('portal-gemi--companion', self.progress > .96),
        },
      })
      // Escala de tiempo 0 → 1 = recorrido completo del scroll fijo.
      timeline
        .to(leaves, { '--door-progress': 1, duration: 0.7 }, 0)
        .to(gemi, { x: 38, y: -14, scale: 0.94, rotate: 16, duration: 0.4 }, 0.2)
        .to(content.querySelectorAll('.portal-copy, .portal-note, .portal-scroll-cue'), { opacity: 0, duration: 0.2 }, 0.45)
        .fromTo('.portal-lightwash', { clipPath: () => `circle(0px at ${doorCenter()})` }, { clipPath: () => `circle(${Math.round(Math.hypot(window.innerWidth, window.innerHeight) * 1.15)}px at ${doorCenter()})`, duration: 0.35, ease: 'power1.in' }, 0.58)
        .to(stage, { backgroundColor: '#FFF9F5', duration: 0.08 }, 0.92)
      if (featured) ScrollTrigger.create({ trigger: featured, start: 'top 70%', end: 'bottom 30%', onEnter: () => { gemi.classList.add('portal-gemi--featured'); gemi.classList.remove('portal-gemi--contact') }, onEnterBack: () => { gemi.classList.add('portal-gemi--featured'); gemi.classList.remove('portal-gemi--contact') }, onLeaveBack: () => gemi.classList.remove('portal-gemi--featured') })
      if (contact) ScrollTrigger.create({ trigger: contact, start: 'top 72%', end: 'bottom 25%', onEnter: () => { gemi.classList.add('portal-gemi--contact'); gemi.classList.remove('portal-gemi--featured') }, onEnterBack: () => { gemi.classList.add('portal-gemi--contact'); gemi.classList.remove('portal-gemi--featured') }, onLeaveBack: () => gemi.classList.remove('portal-gemi--contact') })
    }, stage)
    return () => { ctx.revert(); window.removeEventListener('pointermove', onPointerMove) }
  }, [])

  return <section ref={stageRef} className="portal-stage portal-stage--flat">
    <div className="portal-sticky"><div className="portal-lightwash" aria-hidden="true" />
      <div className="portal-content hero" ref={contentRef}>
        <div className="shell portal-hero-grid">
          <div className="portal-copy">
            <p className="hero-kicker"><span /> Objetos con personalidad</p>
            <Image className="portal-logo" src="/productos/logo-transparent.png" alt="Gemma" width={466} height={275} priority />
            <p className="portal-tagline">Hacemos que cada rincón <em>brille.</em></p>
            <p className="hero-lead">Diseños impresos en 3D, hechos a pedido y llenos de color. Para que tu casa se sienta un poquito más vos.</p>
            <div className="hero-actions"><a href="/tienda" className="button button--pink">Ver la tienda <span aria-hidden="true">→</span></a><a href="#quienes-somos" className="button button--outline">Conocer Gemma</a></div>
          </div>
          <div className="portal-art" aria-hidden="true">
            <svg className="portal-glow" viewBox="0 0 440 520" fill="none"><path d="M76 510V208C76 93 141 34 220 34s144 59 144 174v302" fill="#FFD8A8" opacity=".96"/><path d="M100 510V211C100 112 153 63 220 63s120 49 120 148v299" stroke="#FFD93D" strokeWidth="7" opacity=".8"/><path d="M220 26c-98 0-178 77-178 183v301h32V209c0-88 64-151 146-151s146 63 146 151v301h32V209C398 103 318 26 220 26Z" fill="#FF4DA6" opacity=".16"/></svg>
            <div className="portal-door" ref={leavesRef}>
              <div className="portal-leaf portal-leaf--single"><svg viewBox="0 0 440 460" preserveAspectRatio="none"><path d="M426 460H14V184C14 80 114 14 220 14s206 66 206 170v276Z" fill="#FF4DA6"/><path d="M426 460H14V184C14 80 114 14 220 14s206 66 206 170v276Z" stroke="#FF83C2" strokeWidth="8" opacity=".45"/><path d="M40 422V194c0-82 74-139 180-139s180 57 180 139v228" stroke="#F72F90" strokeWidth="12" opacity=".35"/></svg></div>
            </div>
            <div className="portal-gemi" ref={gemiRef}><svg viewBox="0 0 100 116" role="img" aria-label="Gemi, la gema de Gemma"><defs><linearGradient id="gemiPink" x1="14" y1="8" x2="82" y2="104" gradientUnits="userSpaceOnUse"><stop stopColor="#FFB4DB"/><stop offset=".35" stopColor="#FF4DA6"/><stop offset="1" stopColor="#D62983"/></linearGradient></defs><path d="M50 5 89 31 80 84 50 111 20 84 11 31 50 5Z" fill="var(--gemi-fill, url(#gemiPink))" stroke="#FFB4DB" strokeWidth="3"/><path d="m50 5 9 31-9 75-30-27 30-48Z" fill="#FF83C2" opacity=".42"/><path d="m50 5-9 31 9 75 30-27-30-48Z" fill="#C12578" opacity=".33"/><path d="m11 31 30 5 9-31M89 31l-30 5M20 84l30-48 30 48" fill="none" stroke="#FFDAEF" strokeWidth="2" opacity=".72"/><g className="gemi-eyes"><ellipse cx="38" cy="58" rx="4" ry="7" fill="#6D28D9"/><ellipse cx="62" cy="58" rx="4" ry="7" fill="#6D28D9"/><ellipse cx="27" cy="72" rx="7" ry="3" fill="#6D28D9" opacity=".7"/><ellipse cx="73" cy="72" rx="7" ry="3" fill="#6D28D9" opacity=".7"/></g><path className="gemi-mouth" d="M39 79 Q50 91 61 79" fill="none" stroke="#6D28D9" strokeWidth="3" strokeLinecap="round"/></svg></div>
            <div className="portal-note">Gemi abre la puerta a un rincón más lindo.</div>
          </div>
        </div>
        <div className="portal-scroll-cue"><span className="portal-scroll-line" /> bajá para entrar</div>
      </div>
    </div>
  </section>
}
