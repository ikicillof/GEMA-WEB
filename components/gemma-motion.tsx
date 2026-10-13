'use client'

import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function GemmaMotion() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.registerPlugin(ScrollTrigger)
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.product-card').forEach((card, index) => {
        gsap.fromTo(card, { opacity: 0, y: 24, scale: .94, rotate: index % 2 ? 1.5 : -1.5 }, { opacity: 1, y: 0, scale: 1, rotate: 0, duration: .72, delay: (index % 4) * .06, ease: 'back.out(1.45)', immediateRender: false, scrollTrigger: { trigger: card, start: 'top 92%', once: true } })
      })
      gsap.utils.toArray<HTMLElement>('.section-title em, .portal-tagline em').forEach(word => {
        gsap.fromTo(word, { opacity: 0, scale: .68, y: 12 }, { opacity: 1, scale: 1, y: 0, duration: .7, ease: 'elastic.out(1, .55)', immediateRender: false, scrollTrigger: { trigger: word, start: 'top 88%', once: true } })
      })
    })
    return () => ctx.revert()
  }, [])
  return null
}
