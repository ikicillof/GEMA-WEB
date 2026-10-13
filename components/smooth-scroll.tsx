'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Scroll suave de toda la web. Rueda con más inercia y menos respuesta brusca; el dedo en el celular queda nativo.
// Con prefers-reduced-motion no se activa (scroll del navegador, sin suavizado).
let lenis: Lenis | null = null
export const getLenis = () => lenis

// Curva suave al empezar y al terminar (sine.inOut): el final se asienta despacio.
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2

export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.registerPlugin(ScrollTrigger)
    const instance = new Lenis({ lerp: 0.07, wheelMultiplier: 0.8, smoothWheel: true, syncTouch: false })
    lenis = instance
    // ScrollTrigger lee la posición que mueve Lenis, en el mismo cuadro de GSAP.
    instance.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => instance.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    // Links a anclas de la misma página: deslizamiento suave con Lenis.
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]')
      const hash = link?.getAttribute('href')
      if (!hash || hash === '#' || !document.querySelector(hash)) return
      e.preventDefault()
      instance.scrollTo(hash, { duration: 1.6, easing: easeInOutSine })
    }
    document.addEventListener('click', onClick)
    return () => { document.removeEventListener('click', onClick); gsap.ticker.remove(tick); instance.destroy(); lenis = null }
  }, [])
  return null
}
