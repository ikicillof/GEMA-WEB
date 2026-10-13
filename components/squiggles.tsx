'use client'

import type { MutableRefObject } from 'react'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

// Firuletes de formas distintas. Posición (x, y) como fracción de pantalla; largo y amplitud en "unidades" (1000 = ancho de referencia).
// Se dibujan hasta la mitad de su ventana de scroll [from, to] y después se borran.
export type Kind = 'loop' | 'coil' | 'wave' | 'scribble' | 'spiral'
export type Spec = { kind: Kind; x: number; y: number; len: number; angle: number; n: number; amp: number; color: string; from: number; to: number; mobile: boolean }

function shapePath({ kind, x: fx, y: fy, len, angle, n, amp }: Spec, w: number, h: number) {
  const u = Math.min(w, h * 1.7) / 1000, L = len * u, A = amp * u, r = (angle * Math.PI) / 180
  const cos = Math.cos(r), sin = Math.sin(r), steps = Math.ceil(n * 28)
  let d = ''
  for (let i = 0; i <= steps; i++) {
    const s = i / steps, th = s * n * 2 * Math.PI
    let x: number, y: number
    if (kind === 'spiral') { x = (L / 2) * s * Math.cos(th); y = (L / 2) * s * Math.sin(th) }
    else if (kind === 'wave') { x = s * L; y = A * Math.sin(th) }
    else if (kind === 'scribble') { x = s * L + A * Math.cos(th); y = A * Math.sin(2 * th) }
    else { const a = L / (n * 2 * Math.PI); x = a * th - A * Math.sin(th); y = -A * Math.cos(th) + Math.sin(s * Math.PI) * L * 0.05 } // loop y coil: trocoide
    d += `${i ? 'L' : 'M'}${(fx * w + x * cos - y * sin).toFixed(1)} ${(fy * h + x * sin + y * cos).toFixed(1)}`
  }
  return d
}
// Dibuja hasta la mitad de la ventana [from, to] y borra en la otra mitad; con movimiento reducido quedan dibujados.
export function drawSquiggles(paths: (SVGPathElement | null)[], specs: Spec[], p: number, reduced: boolean) {
  specs.forEach(({ from, to }, i) => {
    const el = paths[i]; if (!el) return
    const mid = (from + to) / 2
    el.style.strokeDashoffset = String(reduced ? 0 : p < mid ? 1 - clamp01((p - from) / (mid - from)) : -clamp01((p - mid) / (to - mid)))
  })
}
export function Squiggles({ specs, size, paths }: { specs: Spec[]; size: { w: number; h: number }; paths: MutableRefObject<(SVGPathElement | null)[]> }) {
  return <svg className="journey-squiggles" viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden="true">
    {specs.map((spec, i) => <path key={i} ref={el => { paths.current[i] = el }} d={shapePath(spec, size.w, size.h)} stroke={spec.color} pathLength={1} className={spec.mobile ? 'squiggle' : 'squiggle squiggle--extra'} />)}
  </svg>
}

