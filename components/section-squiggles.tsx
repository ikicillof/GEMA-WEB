'use client'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Squiggles, drawSquiggles } from './squiggles'
import type { Spec } from './squiggles'

/** Firuletes para una sección que NO queda fija: se dibujan (y se borran) mientras la sección cruza la pantalla.
 *  `target` es la sección (position: relative); el SVG ocupa toda su caja. Con movimiento reducido quedan dibujados. */
export function SectionSquiggles({ specs, target, reduced }: { specs: Spec[]; target: RefObject<HTMLElement>; reduced: boolean }) {
  const paths = useRef<(SVGPathElement | null)[]>([])
  const [size, setSize] = useState({ w: 1000, h: 800 })
  useEffect(() => {
    const el = target.current
    if (!el) return
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight })
    measure()
    const ro = new ResizeObserver(measure); ro.observe(el)
    gsap.registerPlugin(ScrollTrigger)
    const st = ScrollTrigger.create({ trigger: el, start: 'top 90%', end: 'bottom 20%', onUpdate: self => drawSquiggles(paths.current, specs, self.progress, reduced) })
    drawSquiggles(paths.current, specs, reduced ? 0.5 : 0, reduced)
    return () => { ro.disconnect(); st.kill() }
  }, [target, specs, reduced])
  return <Squiggles specs={specs} size={size} paths={paths} />
}
