'use client'

import { memo, useEffect, useId, useRef, useState } from 'react'

type Pt = [number, number]
type Layout = { w: number; h: number; xs: number[]; ys: number[]; route: Pt[]; houseX: number; scale: number; simple: boolean }

// Zona norte inventada: sin calles reales ni ubicación del local.
const DESKTOP: Layout = { w: 800, h: 440, xs: [160, 380, 600], ys: [110, 250, 380], route: [[-40, 380], [160, 380], [160, 250], [380, 250], [380, 110], [600, 110], [600, 250], [720, 250]], houseX: 720, scale: 1.1, simple: false }
const MOBILE: Layout = { w: 360, h: 420, xs: [110, 250], ys: [100, 230, 340], route: [[-40, 340], [110, 340], [110, 230], [315, 230]], houseX: 315, scale: 0.95, simple: true }

const BLOCKS = ['#FFE0EF', '#DDF8F4', '#FFF0B3', '#E8DEFB']
const ROOFS = ['#FF4DA6', '#6D28D9', '#FFD93D', '#00E6D2']
const INK = '#171717'
const GAP = 15
const BRAKE_AT = 0.92
const DURATION = 6500 // ms que dura el recorrido completo

// Camino con esquinas redondeadas a partir de los vértices.
function rounded(points: Pt[], r: number) {
  let d = `M${points[0][0]} ${points[0][1]}`
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1], [x, y] = points[i], [nx, ny] = points[i + 1]
    const l1 = Math.hypot(x - px, y - py), l2 = Math.hypot(nx - x, ny - y), k = Math.min(r, l1 / 2, l2 / 2)
    d += ` L${x - ((x - px) / l1) * k} ${y - ((y - py) / l1) * k} Q${x} ${y} ${x + ((nx - x) / l2) * k} ${y + ((ny - y) / l2) * k}`
  }
  const [lx, ly] = points[points.length - 1]
  return `${d} L${lx} ${ly}`
}

const Tree = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => <g transform={`translate(${x} ${y}) scale(${s})`}><rect x={-1.6} y={-3} width={3.2} height={7} rx={1.6} fill={INK} opacity={0.7} /><circle cy={-10} r={11} fill="#58E3D4" stroke={INK} strokeWidth={1.4} /><circle cx={-3.5} cy={-13} r={3.2} fill="#BFF7F0" /></g>
const Casita = ({ x, y, roof, s = 1 }: { x: number; y: number; roof: string; s?: number }) => <g transform={`translate(${x} ${y}) scale(${s})`}><rect x={-13} y={-18} width={26} height={18} rx={3} fill="#fff" stroke={INK} strokeWidth={1.4} /><path d="M-16 -17 L0 -31 L16 -17 Z" fill={roof} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" /><rect x={-3} y={-10} width={6} height={10} rx={2} fill={INK} opacity={0.75} /></g>
const Star = ({ s = 1 }: { s?: number }) => <path d="M0 -6 Q1 -1 6 0 Q1 1 0 6 Q-1 1 -6 0 Q-1 -1 0 -6Z" fill="#fff" transform={`scale(${s})`} />

// Fondo del mapa: no cambia con el scroll, así que no se vuelve a renderizar.
const MapArt = memo(function MapArt({ layout }: { layout: Layout }) {
  const { w, h, xs, ys, houseX, route } = layout
  const bx = [-30, ...xs, w + 30], by = [-30, ...ys, h + 30]
  const routeY = route[route.length - 1][1]
  const blocks: React.ReactNode[] = []
  for (let i = 0; i < bx.length - 1; i++) for (let j = 0; j < by.length - 1; j++) {
    const x0 = bx[i] + (i === 0 ? 0 : GAP), x1 = bx[i + 1] - (i === bx.length - 2 ? 0 : GAP)
    const y0 = by[j] + (j === 0 ? 0 : GAP), y1 = by[j + 1] - (j === by.length - 2 ? 0 : GAP)
    const bw = x1 - x0, bh = y1 - y0, cx = x0 + bw / 2
    const isHouseBlock = houseX > x0 && houseX < x1 && y1 === routeY - GAP
    const kind = (i * 2 + j) % 4
    let deco: React.ReactNode = null
    if (!isHouseBlock && bw > 60 && bh > 60) {
      const bottom = y1 - 14, top = y0 + 36
      if (layout.simple) deco = (i + j) % 2 === 0 ? <Tree x={cx} y={(top + bottom) / 2 + 8} s={1.25} /> : null
      else if (kind === 0) deco = <><Tree x={x0 + bw * 0.3} y={bottom - 8} /><Tree x={x0 + bw * 0.7} y={top + 8} s={0.9} /><Tree x={x0 + bw * 0.55} y={bottom} s={0.8} /></>
      else if (kind === 1) deco = <><Casita x={x0 + bw * 0.3} y={bottom} roof={ROOFS[(i + j) % 4]} /><Casita x={x0 + bw * 0.7} y={bottom} roof={ROOFS[(i + j + 1) % 4]} /></>
      else if (kind === 2) deco = <><Casita x={x0 + bw * 0.62} y={bottom} roof={ROOFS[(i + j + 2) % 4]} /><Tree x={x0 + bw * 0.25} y={bottom - 4} s={1.1} /></>
      else deco = <><Tree x={x0 + bw * 0.35} y={(top + bottom) / 2 + 6} s={1.2} /><Tree x={x0 + bw * 0.65} y={(top + bottom) / 2 + 12} /></>
    }
    blocks.push(<g key={`${i}-${j}`}><rect x={x0} y={y0} width={bw} height={bh} rx={20} fill={BLOCKS[(i + j * 3) % 4]} />{deco}</g>)
  }
  return <>{blocks}</>
})

function Moto({ boxed }: { boxed: boolean }) {
  return <g>
    <ellipse cx={0} cy={1} rx={30} ry={3.5} fill={INK} opacity={0.18} />
    <g style={{ opacity: boxed ? 0 : 1 }}>
      <line x1={-37} y1={-27} x2={-17} y2={-27} stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
      <rect x={-38} y={-47} width={22} height={20} rx={4} fill="#FF4DA6" stroke={INK} strokeWidth={1.6} />
      <rect x={-29} y={-47} width={4} height={20} fill="#FFB4DB" opacity={0.7} />
      <g transform="translate(-27 -37)"><Star s={0.9} /></g>
    </g>
    <circle cx={-19} cy={-9} r={9} fill={INK} /><circle cx={-19} cy={-9} r={4} fill="#FFB4DB" />
    <circle cx={19} cy={-9} r={9} fill={INK} /><circle cx={19} cy={-9} r={4} fill="#FFB4DB" />
    <path d="M-24 -14 Q-25 -29 -9 -29 L5 -29 L11 -20 L23 -18 Q27 -17 26 -13 L-20 -13 Z" fill="#6D28D9" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
    <rect x={-21} y={-33} width={20} height={6} rx={3} fill={INK} />
    <line x1={14} y1={-29} x2={12} y2={-43} stroke={INK} strokeWidth={3} strokeLinecap="round" /><line x1={12} y1={-43} x2={17} y2={-43} stroke={INK} strokeWidth={3} strokeLinecap="round" />
    <circle cx={25} cy={-22} r={3} fill="#FFD93D" stroke={INK} strokeWidth={1} />
    <path d="M-13 -34 Q-14 -51 -3 -51 Q4 -51 3 -43 L12 -43" fill="none" stroke="#FFD93D" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
    <circle cx={-4} cy={-61} r={7.5} fill="#FFB4DB" stroke={INK} strokeWidth={1.4} />
    <path d="M-11.5 -61 A7.5 7.5 0 0 1 3.5 -61 L3.5 -58.5 L-11.5 -58.5 Z" fill="#FF4DA6" stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
  </g>
}

export function DeliveryMap() {
  const uid = useId().replace(/:/g, '')
  const [mobile, setMobile] = useState(false)
  const [arrived, setArrived] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const routeRef = useRef<SVGPathElement>(null)
  const maskRef = useRef<SVGPathElement>(null)
  const motoRef = useRef<SVGGElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const layout = mobile ? MOBILE : DESKTOP
  const routeD = rounded(layout.route, 34)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 700px)')
    const sync = () => setMobile(mq.matches)
    sync(); mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const section = sectionRef.current, route = routeRef.current, mask = maskRef.current, moto = motoRef.current
    if (!section || !route || !mask || !moto) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const L = route.getTotalLength(), Lm = L - 62 // la moto frena antes de la puerta; el último tramo se completa al llegar
    const S = layout.scale
    let facing = 1, isArrived = false, raf = 0
    mask.style.strokeDasharray = `${L}`
    const render = (p: number) => {
      const m = Math.min(1, Math.max(0, p / 0.88)), len = m * Lm
      const pt = route.getPointAtLength(len), a = route.getPointAtLength(Math.max(0, len - 3)), b = route.getPointAtLength(Math.min(L, len + 3))
      if (Math.abs(b.x - a.x) > 0.01) facing = b.x > a.x ? 1 : -1
      moto.setAttribute('transform', `translate(${pt.x} ${pt.y + 9}) scale(${facing * S} ${S})`)
      moto.style.visibility = 'visible'
      const nowArrived = p >= BRAKE_AT
      mask.style.strokeDashoffset = `${L - (nowArrived ? L : len)}`
      if (nowArrived !== isArrived) { isArrived = nowArrived; setArrived(nowArrived) }
      const t = titleRef.current
      const o1 = Math.min(1, Math.max(0, (p - 0.05) / 0.2))
      if (t) { t.style.opacity = `${o1}`; t.style.transform = `translateY(${(1 - o1) * 18}px)` }
    }
    if (reduced) { render(1); return }
    // Como un video: arranca solo cuando el mapa se ve completo y corre por tiempo, sin depender del scroll.
    // Si el mapa sale por completo de la pantalla se reinicia y vuelve a correr la próxima vez.
    const card = section.querySelector('.delivery-card') as HTMLElement
    let playing = false
    const play = () => {
      playing = true
      const t0 = performance.now()
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / DURATION)
        render(p)
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }
    render(0)
    const io = new IntersectionObserver(([entry]) => {
      // En pantallas más bajas que el mapa, "completo" es todo lo que entra.
      const needed = Math.min(0.97, (window.innerHeight / Math.max(1, entry.boundingClientRect.height)) * 0.97)
      if (!playing && entry.intersectionRatio >= needed) play()
      else if (playing && entry.intersectionRatio === 0) { cancelAnimationFrame(raf); playing = false; render(0) }
    }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) })
    io.observe(card)
    return () => { cancelAnimationFrame(raf); io.disconnect() }
  }, [layout])

  const doorY = layout.route[layout.route.length - 1][1] - GAP
  const hx = layout.houseX
  return <section ref={sectionRef} className="delivery section" aria-labelledby="delivery-title">
    <div className="shell delivery-grid">
      <div className="delivery-copy">
        <p className="eyebrow">Entrega</p>
        <h2 id="delivery-title" ref={titleRef} className="delivery-title">Te lo llevamos a la puerta de tu casa</h2>
      </div>
      <div className="delivery-card">
        <svg viewBox={`0 0 ${layout.w} ${layout.h}`} role="img" aria-label="Mapa ilustrado de zona norte con una moto de Gemma que lleva un pedido hasta la puerta de una casita" preserveAspectRatio="xMidYMid slice">
          <defs>
            <mask id={`${uid}-m`} maskUnits="userSpaceOnUse" x={-60} y={-60} width={layout.w + 120} height={layout.h + 120}><path ref={maskRef} d={routeD} fill="none" stroke="#fff" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" /></mask>
            <radialGradient id={`${uid}-g`}><stop offset="0" stopColor="#FFD93D" stopOpacity={0.95} /><stop offset="1" stopColor="#FFD93D" stopOpacity={0} /></radialGradient>
          </defs>
          <rect x={-30} y={-30} width={layout.w + 60} height={layout.h + 60} fill="#FFFDF9" />
          <MapArt layout={layout} />
          <path ref={routeRef} d={routeD} fill="none" stroke="none" />
          <path d={routeD} fill="none" stroke="#FF4DA6" strokeWidth={5} strokeLinecap="round" strokeDasharray="0.1 13" mask={`url(#${uid}-m)`} />
          <g transform={`translate(${hx} ${doorY})`} className={`delivery-house ${arrived ? 'delivery-house--lit' : ''}`}>
            <ellipse className="delivery-glow" cx={0} cy={-26} rx={62} ry={50} fill={`url(#${uid}-g)`} />
            <rect x={-30} y={-38} width={60} height={38} rx={5} fill="#fff" stroke={INK} strokeWidth={1.8} />
            <path d="M-36 -36 L0 -66 L36 -36 Z" fill="#FF4DA6" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
            <rect className="delivery-window" x={-24} y={-30} width={12} height={12} rx={3} fill="#E8DEFB" stroke={INK} strokeWidth={1.4} />
            <rect className="delivery-window" x={12} y={-30} width={12} height={12} rx={3} fill="#E8DEFB" stroke={INK} strokeWidth={1.4} />
            <rect className="delivery-door" x={-7} y={-22} width={14} height={22} rx={5} fill="#6D28D9" stroke={INK} strokeWidth={1.6} />
            <circle cx={3} cy={-11} r={1.3} fill="#FFD93D" />
          </g>
          <g transform={`translate(${hx} ${doorY + 14})`}><g className={`delivery-box ${arrived ? 'delivery-box--show' : ''}`}>
            <rect x={-12} y={-22} width={24} height={22} rx={4} fill="#FF4DA6" stroke={INK} strokeWidth={1.6} /><rect x={-2} y={-22} width={4} height={22} fill="#FFB4DB" opacity={0.7} /><g transform="translate(-7 -11)"><Star s={0.9} /></g>
          </g></g>
          <g ref={motoRef} style={{ visibility: 'hidden' }}><g className={arrived ? 'delivery-moto delivery-moto--brake' : 'delivery-moto'}><Moto boxed={arrived} /></g></g>
        </svg>
      </div>
    </div>
  </section>
}
