'use client'

import { useEffect, useRef } from 'react'

// Estela del cursor: UN solo canvas fijo y un pool fijo de partículas que se reciclan (no se crean ni se borran
// elementos al mover el mouse). El bucle de dibujo solo corre mientras hay partículas vivas.
const COLORS = ['#FF4DA6', '#6D28D9', '#00E6D2', '#FFD93D', '#FFB4DB'] // paleta del brand book
const MAX = 25
const SQUIGGLE = 0, STAR4 = 1, STAR5 = 2
type Kind = 0 | 1 | 2
type Particle = { on: boolean; kind: Kind; x: number; y: number; vx: number; vy: number; rot: number; spin: number; size: number; color: string; born: number; life: number }

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(list: T[]) => list[(Math.random() * list.length) | 0]

// Firulete corto: dos ondas con puntas redondeadas, como los de abajo de la palabra del logo.
function squiggle(ctx: CanvasRenderingContext2D, s: number, color: string) {
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(2.2, s * 0.3); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.beginPath(); ctx.moveTo(-s, 0)
  ctx.quadraticCurveTo(-s * 0.6, -s * 0.95, -s * 0.2, 0); ctx.quadraticCurveTo(s * 0.2, s * 0.95, s * 0.6, 0); ctx.quadraticCurveTo(s * 0.8, -s * 0.4, s, -s * 0.1)
  ctx.stroke()
}
// Estrellita de 4 puntas, finita y brillante: halo suave + cuerpo + centro blanco.
function star4Path(ctx: CanvasRenderingContext2D, r: number) {
  const k = r * 0.13
  ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(k, -k, r, 0); ctx.quadraticCurveTo(k, k, 0, r); ctx.quadraticCurveTo(-k, k, -r, 0); ctx.quadraticCurveTo(-k, -k, 0, -r); ctx.closePath()
}
function star4(ctx: CanvasRenderingContext2D, r: number, color: string, alpha: number) {
  ctx.fillStyle = color; ctx.globalAlpha = alpha * 0.28; star4Path(ctx, r * 1.55); ctx.fill()
  ctx.globalAlpha = alpha; star4Path(ctx, r); ctx.fill()
  ctx.fillStyle = '#fff'; ctx.globalAlpha = alpha * 0.85; star4Path(ctx, r * 0.5); ctx.fill()
}
// Estrellita de 5 puntas gordita y mullida: el trazo del mismo color con uniones redondeadas la infla.
function star5(ctx: CanvasRenderingContext2D, r: number, color: string, alpha: number) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, d = i % 2 ? r * 0.52 : r; ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d) }
  ctx.closePath()
  ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineJoin = 'round'; ctx.lineWidth = r * 0.5; ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#fff'; ctx.globalAlpha = alpha * 0.45; ctx.beginPath(); ctx.ellipse(-r * 0.22, -r * 0.3, r * 0.2, r * 0.13, -0.6, 0, Math.PI * 2); ctx.fill()
}

export function CursorTrail() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)'), reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pool: Particle[] = Array.from({ length: MAX }, () => ({ on: false, kind: 0, x: 0, y: 0, vx: 0, vy: 0, rot: 0, spin: 0, size: 0, color: '', born: 0, life: 1 }))
    let enabled = false, raf = 0, lastFrame = 0, w = 0, h = 0
    let lastX = 0, lastY = 0, lastT = 0, acc = 0, have = false

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      w = window.innerWidth; h = window.innerHeight
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const spawn = (x: number, y: number, vx: number, vy: number, life: number, kind: Kind, force = false) => {
      let p = pool.find(q => !q.on)
      if (!p) { if (!force) return; p = pool.reduce((a, b) => (b.born < a.born ? b : a)) } // la ráfaga recicla la más vieja
      p.on = true; p.kind = kind; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.rot = rand(-0.9, 0.9); p.spin = rand(-0.004, 0.004)
      p.size = kind === SQUIGGLE ? rand(6.5, 10.5) : kind === STAR4 ? rand(6, 11) : rand(5, 8)
      p.color = pick(COLORS); p.born = performance.now(); p.life = life
      if (!raf) { lastFrame = performance.now(); raf = requestAnimationFrame(frame) }
    }
    const frame = (now: number) => {
      const dt = Math.min(48, now - lastFrame); lastFrame = now
      ctx.clearRect(0, 0, w, h)
      let alive = 0
      for (const p of pool) {
        if (!p.on) continue
        const t = (now - p.born) / p.life
        if (t >= 1) { p.on = false; continue }
        alive++
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.00003 * dt; p.rot += p.spin * dt
        const alpha = 1 - t * t, pop = t < 0.15 ? 0.4 + 4 * t : 1, s = p.size * pop * (1 - 0.45 * t) // aparece con un pequeño rebote y se achica al irse
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = alpha
        if (p.kind === SQUIGGLE) squiggle(ctx, s, p.color); else if (p.kind === STAR4) star4(ctx, s, p.color, alpha); else star5(ctx, s, p.color, alpha)
        ctx.restore()
      }
      raf = alive ? requestAnimationFrame(frame) : 0
      if (!alive) ctx.clearRect(0, 0, w, h)
    }
    const kindAtRandom = (): Kind => { const r = Math.random(); return r < 0.3 ? SQUIGGLE : r < 0.65 ? STAR4 : STAR5 }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const now = performance.now()
      if (!have) { lastX = e.clientX; lastY = e.clientY; lastT = now; have = true; return }
      const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY), speed = dist / Math.max(1, now - lastT)
      lastX = e.clientX; lastY = e.clientY; lastT = now
      // Más rápido = menos distancia entre elementos: lento ≈ una estrellita cada tanto, rápido ≈ estela llena.
      const step = Math.min(72, Math.max(16, 72 - speed * 38))
      acc += dist
      for (let n = 0; acc >= step && n < 3; n++) {
        acc -= step
        spawn(e.clientX + rand(-4, 4), e.clientY + rand(-4, 4), rand(-0.025, 0.025), rand(-0.03, 0.01), rand(430, 600), kindAtRandom())
      }
      if (acc > step * 3) acc = 0
    }
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const count = 9, base = rand(0, Math.PI * 2)
      for (let i = 0; i < count; i++) {
        const a = base + (i / count) * Math.PI * 2 + rand(-0.25, 0.25), v = rand(0.1, 0.26)
        spawn(e.clientX, e.clientY, Math.cos(a) * v, Math.sin(a) * v, rand(500, 700), Math.random() < 0.55 ? STAR4 : STAR5, true)
      }
    }
    const onLeave = () => { have = false; acc = 0 }

    const enable = () => {
      if (enabled) return
      enabled = true; resize(); canvas.style.display = 'block'
      window.addEventListener('pointermove', onMove, { passive: true }); window.addEventListener('pointerdown', onDown, { passive: true })
      window.addEventListener('resize', resize); document.documentElement.addEventListener('pointerleave', onLeave)
    }
    const disable = () => {
      if (!enabled) return
      enabled = false; canvas.style.display = 'none'; have = false; acc = 0
      cancelAnimationFrame(raf); raf = 0; pool.forEach(p => { p.on = false })
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('resize', resize); document.documentElement.removeEventListener('pointerleave', onLeave)
    }
    // Solo escritorio (mouse con hover) y sin movimiento reducido; se reevalúa si cambian esas preferencias.
    const sync = () => { if (fine.matches && !reduce.matches) enable(); else disable() }
    sync()
    fine.addEventListener('change', sync); reduce.addEventListener('change', sync)
    return () => { fine.removeEventListener('change', sync); reduce.removeEventListener('change', sync); disable() }
  }, [])
  return <canvas ref={ref} className="cursor-trail" aria-hidden="true" />
}
