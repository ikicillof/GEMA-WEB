'use client'

import dynamic from 'next/dynamic'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { invalidate } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { Color } from 'three'
import type { RoomProgress } from './room-scene'
import { PARADE_TIMING } from './journey-scene'
import { easeInOutSine, getLenis } from './smooth-scroll'

const JourneyScene = dynamic(() => import('./journey-scene'), { ssr: false })
const GemiScene = dynamic(() => import('./gemi-scene'), { ssr: false })
const RoomScene = dynamic(() => import('./room-scene'), { ssr: false })
// La misma puerta 3D del hero (el modelo ya está cargado y cacheado), para la salida de la sección 4.
const DoorScene = dynamic(() => import('./hero-door-scene'), { ssr: false })

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const ease = (t: number) => t * t * (3 - 2 * t)

// Líneas de tiempo que también definen las paradas del snap (fracciones del tramo fijo de cada sección).
const PARADE_TEXT = [0.3, 0.56] // el texto del desfile se ve entre estos puntos
const ROOM_TEXT_IN = 0.86 // el texto del cuarto aparece acá (ya encendido)
// Salida: Gemi arranca enseguida (sin pausa vacía al llegar), saluda, la puerta se cierra y después entra el negro.
const DOOR = { GEMI_FROM: 0.04, WAVE_FROM: 0.18, CLOSE_FROM: 0.3, CLOSE_TO: 0.72, BLACK_TO: 0.9 }
// Desfile: la estrella (objeto 2) ya entró un 30 % de su recorrido, con los tres en pantalla y el texto visible.
const PARADE_STOP = 2 * PARADE_TIMING.STAGGER + (0.3 - PARADE_TIMING.HEAD_START) * PARADE_TIMING.WINDOW
const ROOM_STOP = (ROOM_TEXT_IN + 1) / 2 + 0.02 // cuarto encendido con el texto ya visible
const DOOR_STOP = DOOR.CLOSE_FROM // Gemi ya saludó en la puerta abierta, justo antes de que se cierre
const DOOR_CLOSED_STOP = DOOR.CLOSE_TO // puerta cerrada, antes de que entre el negro
// Las animaciones de cada sección siguen al scroll con retardo (más lentas y suaves).
const SCRUB = 1.5
// Firuletes de formas distintas. Posición (x, y) como fracción de pantalla; largo y amplitud en "unidades" (1000 = ancho de referencia).
// Se dibujan hasta la mitad de su ventana de scroll [from, to] y después se borran.
type Kind = 'loop' | 'coil' | 'wave' | 'scribble' | 'spiral'
type Spec = { kind: Kind; x: number; y: number; len: number; angle: number; n: number; amp: number; color: string; from: number; to: number; mobile: boolean }
const PARADE_SPECS: Spec[] = [
  { kind: 'loop', x: 0.04, y: 0.14, len: 380, angle: 8, n: 6, amp: 24, color: '#00E6D2', from: 0, to: 0.45, mobile: true },
  { kind: 'wave', x: 0.45, y: 0.135, len: 260, angle: -4, n: 3, amp: 16, color: '#6D28D9', from: 0.06, to: 0.5, mobile: false },
  { kind: 'loop', x: 0.03, y: 0.92, len: 420, angle: -6, n: 7, amp: 22, color: '#FF4DA6', from: 0.05, to: 0.6, mobile: true },
  { kind: 'coil', x: 0.4, y: 0.94, len: 300, angle: 5, n: 12, amp: 9, color: '#FFD93D', from: 0.2, to: 0.75, mobile: false },
  { kind: 'scribble', x: 0.62, y: 0.92, len: 240, angle: -6, n: 4, amp: 18, color: '#00E6D2', from: 0.4, to: 0.95, mobile: false },
  { kind: 'wave', x: 0.02, y: 0.32, len: 300, angle: 82, n: 5, amp: 12, color: '#FFD93D', from: 0.12, to: 0.6, mobile: true },
  { kind: 'loop', x: 0.975, y: 0.36, len: 320, angle: 98, n: 6, amp: 17, color: '#6D28D9', from: 0.3, to: 0.8, mobile: true },
  { kind: 'spiral', x: 0.9, y: 0.9, len: 110, angle: 0, n: 2.5, amp: 0, color: '#FF4DA6', from: 0.55, to: 1, mobile: false },
  { kind: 'spiral', x: 0.09, y: 0.25, len: 90, angle: 0, n: 3, amp: 0, color: '#6D28D9', from: 0.1, to: 0.55, mobile: false },
]
// Sección 2: en los bordes, sin pasar por el centro (Gemi), la izquierda (texto) ni la derecha (colores).
const GEMI_SPECS: Spec[] = [
  { kind: 'spiral', x: 0.2, y: 0.19, len: 100, angle: 0, n: 3, amp: 0, color: '#6D28D9', from: 0.1, to: 0.6, mobile: false },
  { kind: 'wave', x: 0.36, y: 0.14, len: 300, angle: -3, n: 4, amp: 14, color: '#FF4DA6', from: 0.15, to: 0.7, mobile: true },
  { kind: 'loop', x: 0.7, y: 0.16, len: 260, angle: -10, n: 5, amp: 18, color: '#00E6D2', from: 0.2, to: 0.75, mobile: false },
  { kind: 'coil', x: 0.08, y: 0.91, len: 320, angle: 4, n: 12, amp: 9, color: '#FFD93D', from: 0.25, to: 0.85, mobile: true },
  { kind: 'scribble', x: 0.55, y: 0.93, len: 260, angle: -5, n: 4, amp: 16, color: '#6D28D9', from: 0.3, to: 0.9, mobile: false },
  { kind: 'spiral', x: 0.92, y: 0.86, len: 90, angle: 0, n: 3, amp: 0, color: '#00E6D2', from: 0.35, to: 0.9, mobile: true },
]
// Sección 3: en los márgenes, fuera de la pared del rincón.
const RINCON_SPECS: Spec[] = [
  { kind: 'wave', x: 0.03, y: 0.3, len: 260, angle: 85, n: 4, amp: 12, color: '#FF4DA6', from: 0.05, to: 0.5, mobile: true },
  { kind: 'spiral', x: 0.06, y: 0.86, len: 90, angle: 0, n: 3, amp: 0, color: '#00E6D2', from: 0.1, to: 0.6, mobile: false },
  { kind: 'coil', x: 0.28, y: 0.96, len: 300, angle: 3, n: 12, amp: 8, color: '#6D28D9', from: 0.2, to: 0.7, mobile: true },
  { kind: 'scribble', x: 0.6, y: 0.96, len: 240, angle: -4, n: 4, amp: 14, color: '#FFD93D', from: 0.3, to: 0.85, mobile: false },
  { kind: 'loop', x: 0.975, y: 0.3, len: 300, angle: 95, n: 6, amp: 16, color: '#00E6D2', from: 0.35, to: 0.9, mobile: true },
  { kind: 'spiral', x: 0.94, y: 0.86, len: 80, angle: 0, n: 3, amp: 0, color: '#6D28D9', from: 0.4, to: 0.95, mobile: false },
]


// Colores de Gemi: los fuertes de la marca y de los productos (sin blanco, negro, pasteles ni tonos apagados).
type GemiColor = { name: string; hex: string }
const GEMI_PALETTE: GemiColor[] = [
  { name: 'Rosa', hex: '#FF4DA6' }, { name: 'Violeta', hex: '#6D28D9' }, { name: 'Turquesa', hex: '#00E6D2' }, { name: 'Amarillo', hex: '#FFD93D' },
  { name: 'Rojo', hex: '#EF4444' }, { name: 'Fucsia', hex: '#D946EF' }, { name: 'Azul', hex: '#2563EB' }, { name: 'Celeste', hex: '#38BDF8' },
  { name: 'Verde', hex: '#22C55E' }, { name: 'Naranja', hex: '#F97316' },
]
const rgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255].map(v => v / 255) }
const luminance = (hex: string) => { const [r, g, b] = rgb(hex).map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const hue = (hex: string) => {
  const [r, g, b] = rgb(hex), max = Math.max(r, g, b), d = max - Math.min(r, g, b)
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return (h * 60 + 360) % 360
}
// 3 colores al azar que se lean sobre el crema (contraste ≥ 2:1; turquesa y amarillo no llegan) y bien distintos entre sí (≥ 90° de tono).
function pickGemiColors(): GemiColor[] {
  const cream = luminance('#FFF9F5')
  const ok = GEMI_PALETTE.filter(c => (cream + 0.05) / (luminance(c.hex) + 0.05) >= 2)
  const apart = (a: GemiColor, b: GemiColor) => { const d = Math.abs(hue(a.hex) - hue(b.hex)); return Math.min(d, 360 - d) >= 90 }
  const triples: GemiColor[][] = []
  for (let i = 0; i < ok.length; i++) for (let j = i + 1; j < ok.length; j++) for (let k = j + 1; k < ok.length; k++)
    if (apart(ok[i], ok[j]) && apart(ok[i], ok[k]) && apart(ok[j], ok[k])) triples.push([ok[i], ok[j], ok[k]])
  return triples[Math.floor(Math.random() * triples.length)].sort(() => Math.random() - 0.5)
}

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
function drawSquiggles(paths: (SVGPathElement | null)[], specs: Spec[], p: number, reduced: boolean) {
  specs.forEach(({ from, to }, i) => {
    const el = paths[i]; if (!el) return
    const mid = (from + to) / 2
    el.style.strokeDashoffset = String(reduced ? 0 : p < mid ? 1 - clamp01((p - from) / (mid - from)) : -clamp01((p - mid) / (to - mid)))
  })
}
function Squiggles({ specs, size, paths }: { specs: Spec[]; size: { w: number; h: number }; paths: MutableRefObject<(SVGPathElement | null)[]> }) {
  return <svg className="journey-squiggles" viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden="true">
    {specs.map((spec, i) => <path key={i} ref={el => { paths.current[i] = el }} d={shapePath(spec, size.w, size.h)} stroke={spec.color} pathLength={1} className={spec.mobile ? 'squiggle' : 'squiggle squiggle--extra'} />)}
  </svg>
}

export function HomeJourney() {
  const paradeRef = useRef<HTMLElement>(null)
  const gemiRef = useRef<HTMLElement>(null)
  const textRef = useRef<HTMLParagraphElement>(null)
  const gemiTextRef = useRef<HTMLParagraphElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const gemi3dRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const paradePaths = useRef<(SVGPathElement | null)[]>([])
  const gemiPaths = useRef<(SVGPathElement | null)[]>([])
  const progress = useRef(0)
  const rinconRef = useRef<HTMLElement>(null)
  const rinconTextRef = useRef<HTMLParagraphElement>(null)
  const rinconPaths = useRef<(SVGPathElement | null)[]>([])
  const roomProgress = useRef<RoomProgress>({ rincon: 0, enter: 0, exit: 0 })
  const [roomReady, setRoomReady] = useState(false) // el cuarto 3D se carga recién al acercarse a la sección 3
  const doorRef = useRef<HTMLElement>(null)
  const finalRef = useRef<HTMLElement>(null)
  const doorFrameRef = useRef<HTMLDivElement>(null)
  const exitDoor = useRef({ open: 1, dolly: 0 }) // la puerta de salida arranca abierta
  const washRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<{ narrow: boolean; reduced: boolean } | null>(null)
  const [size, setSize] = useState({ w: 1000, h: 600 })
  const [live, setLive] = useState(false)
  const [colors, setColors] = useState<GemiColor[]>([])
  const [active, setActive] = useState(0)
  const colorsRef = useRef<GemiColor[]>([])
  const colorRef = useRef(new Color('#FF4DA6')) // color actual del Gemi 3D (lo lee la escena en cada cuadro)
  // Marca/desmarca un desplazamiento por clic para que el snap no lo corrija (lo define el efecto del scroll).
  const programmaticRef = useRef<((done: boolean) => void) | null>(null)

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    onResize(); window.addEventListener('resize', onResize)
    // Se eligen en el cliente (al azar) para no desincronizar el HTML del servidor.
    const picked = pickGemiColors()
    colorsRef.current = picked; colorRef.current.set(picked[0].hex); setColors(picked)
    setMode({ narrow: window.matchMedia('(max-width: 700px)').matches, reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches })
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // El degradado va en el body (fijo en pantalla): las secciones son transparentes y la 1 se superpone al final de la puerta.
  useEffect(() => {
    const b = document.body.style
    b.background = 'var(--fondo-gemma)'; b.backgroundAttachment = 'fixed'
    return () => { b.background = ''; b.backgroundAttachment = '' }
  }, [])

  useEffect(() => {
    const parade = paradeRef.current, gemiSection = gemiRef.current, room = rinconRef.current, door = doorRef.current, final = finalRef.current
    if (!parade || !gemiSection || !room || !door || !final || !mode) return
    const { reduced } = mode
    const gemiNode = () => document.querySelector<HTMLElement>('.gemi-global')
    const top = (el: HTMLElement) => el.getBoundingClientRect().top + window.scrollY
    const run = (el: HTMLElement) => el.offsetHeight - window.innerHeight
    // Paso entre secciones: la siguiente se superpone media pantalla (margin-top: -50vh). Cada animación termina antes
    // de esa última media pantalla de su tramo fijo (end), así la sección nueva entra sobre un estado ya vacío.
    // Las alturas crecieron lo mismo, así que el ritmo dentro de cada sección no cambia.
    const OVERLAP = 0.5
    const endOf = (el: HTMLElement) => { const r = run(el); return r > 0 ? Math.max(0.5, 1 - (OVERLAP * window.innerHeight) / r) : 1 }
    const within = (el: HTMLElement, raw: number) => Math.min(1, raw / endOf(el)) // progreso de la animación
    const tail = (el: HTMLElement, raw: number) => clamp01((raw - endOf(el)) / (1 - endOf(el))) // tramo de salida

    // Sección 3 (q de 0 a 1) en el cuarto 3D: room-scene calcula caídas, ondas de color, luz y cámara con este progreso;
    // acá van el texto y los firuletes. enter/exit: cuánto entró la sección a la pantalla y cuánto se fue (niebla).
    const paintRincon = (q: number) => {
      roomProgress.current.rincon = q
      if (rinconTextRef.current) rinconTextRef.current.style.opacity = String(reduced ? 1 : clamp01((q - ROOM_TEXT_IN) / 0.05) * (1 - clamp01(roomProgress.current.exit * 2)))
      drawSquiggles(rinconPaths.current, RINCON_SPECS, q, reduced)
      invalidate()
    }

    // Sección 4 (r de 0 a 1): la puerta abierta ya está ahí al llegar (sube con la sección) · 0,18 → 0,32 Gemi viaja al borde
    // de la puerta · 0,32 → 0,44 saluda con un rebote · 0,42 → 0,8 la puerta se cierra (al revés del hero)
    // · 0,8 → 0,97 el grafito cubre la pantalla. Desde que se cierra, Gemi fijo no se muestra en el resto del home.
    let gemiAtDoor = false
    const paintDoor = (r: number) => {
      const close = reduced ? 1 : ease(clamp01((r - DOOR.CLOSE_FROM) / (DOOR.CLOSE_TO - DOOR.CLOSE_FROM)))
      exitDoor.current.open = 1 - close; invalidate() // las hojas se deslizan hacia el centro hasta cerrarse
      const frame = doorFrameRef.current?.getBoundingClientRect()
      if (washRef.current && frame) {
        const wash = reduced ? 0 : ease(clamp01((r - DOOR.CLOSE_TO) / (DOOR.BLACK_TO - DOOR.CLOSE_TO)))
        const cx = frame.left + frame.width / 2, cy = frame.top + frame.height * 0.6
        washRef.current.style.clipPath = `circle(${Math.round(wash * Math.hypot(window.innerWidth, window.innerHeight) * 1.1)}px at ${Math.round(cx)}px ${Math.round(cy)}px)`
      }
      const g = gemiNode()
      if (!g || reduced) return
      g.style.visibility = r >= DOOR.CLOSE_TO ? 'hidden' : ''
      const k = ease(clamp01((r - DOOR.GEMI_FROM) / (DOOR.WAVE_FROM - DOOR.GEMI_FROM)))
      if (k <= 0 || !frame) {
        if (gemiAtDoor) { g.style.translate = ''; g.style.scale = ''; g.style.rotate = ''; gemiAtDoor = false }
        return
      }
      gemiAtDoor = true
      // Igual que en la sección 2: desde su lugar de reposo hasta el borde izquierdo del paso, del lado de adentro.
      g.style.translate = 'none'; g.style.scale = 'none'
      const rest = g.getBoundingClientRect(), s = 1 + 0.8 * k
      const dx = frame.left + frame.width * 0.3 - (rest.left + rest.width / 2)
      const dy = frame.bottom - (rest.height * s) / 2 - 6 - (rest.top + rest.height / 2)
      const u = clamp01((r - DOOR.WAVE_FROM) / 0.12)
      const hop = Math.abs(Math.sin(2 * Math.PI * u)) * (1 - u) * 26
      g.style.translate = `${dx * k}px ${dy * k - hop}px`
      g.style.scale = String(s)
      g.style.rotate = `${Math.sin(4 * Math.PI * u) * (1 - u) * 12}deg`
    }

    const paintParade = (p: number) => {
      progress.current = p
      // Hasta que la sección queda fija no se ve nada: así no "sube desde abajo" mientras todavía termina la puerta.
      if (canvasRef.current) canvasRef.current.style.visibility = p > 0.0005 || reduced ? 'visible' : 'hidden'
      if (textRef.current) textRef.current.style.opacity = String(reduced ? 1 : clamp01((p - PARADE_TEXT[0]) / 0.05) * clamp01((PARADE_TEXT[1] - p) / 0.05))
      drawSquiggles(paradePaths.current, PARADE_SPECS, p, reduced)
      invalidate()
    }

    // Sección 2 (q de 0 a 1): 0 → 0,1 el Gemi ilustrado viaja al centro · 0,1 → 0,14 se funde en el 3D
    // · 0,9 → 0,94 el 3D vuelve a ilustrado · 0,94 → 1 regresa a la esquina.
    // El color sigue 3 tramos iguales (q × 3): fundido suave de ±0,04 de q alrededor de cada cambio.
    const palette = colorsRef.current.map(c => new Color(c.hex))
    let wasLive = false, lastActive = -1
    const resetGemi = (g: HTMLElement) => { g.style.translate = ''; g.style.scale = ''; g.style.opacity = ''; g.style.pointerEvents = '' }
    const paintColor = (q: number) => {
      const c = q * 3
      colorRef.current.copy(palette[0])
      for (const b of [1, 2]) colorRef.current.lerp(palette[b], reduced ? (c >= b ? 1 : 0) : ease(clamp01((c - b + 0.12) / 0.24)))
      const idx = Math.min(2, Math.floor(c))
      if (idx !== lastActive) {
        lastActive = idx; setActive(idx)
        // El Gemi ilustrado toma el mismo color, así al ir y volver de la esquina coincide con el 3D.
        window.dispatchEvent(new CustomEvent('gemma-product-color', { detail: { hex: colorsRef.current[idx].hex } }))
      }
    }
    const paintGemi = (q: number) => {
      const fade = clamp01((q - 0.1) / 0.04) * clamp01((0.94 - q) / 0.04)
      const menu = reduced ? 1 : clamp01((q - 0.14) / 0.03) * clamp01((0.9 - q) / 0.03)
      if (!reduced) paintColor(q)
      invalidate()
      if (gemiTextRef.current) gemiTextRef.current.style.opacity = String(reduced ? 1 : clamp01((q - 0.02) / 0.04) * clamp01((0.3 - q) / 0.04))
      if (gemi3dRef.current) gemi3dRef.current.style.opacity = String(reduced ? 1 : fade)
      if (menuRef.current) { menuRef.current.style.opacity = String(menu); menuRef.current.style.pointerEvents = menu > 0.5 ? 'auto' : 'none'; menuRef.current.inert = menu <= 0.5 }
      drawSquiggles(gemiPaths.current, GEMI_SPECS, q, reduced)
      const isLive = fade > 0
      if (isLive !== wasLive) { wasLive = isLive; setLive(isLive) }

      const g = document.querySelector<HTMLElement>('.gemi-global'), box = gemi3dRef.current
      if (!g || !box || reduced) return
      const k = q < 0.5 ? ease(clamp01(q / 0.1)) : ease(clamp01((1 - q) / 0.06))
      if (k <= 0) { resetGemi(g); return }
      // Misma lógica que el logo: posición en reposo (sin transformar) → centro del Gemi 3D, interpolado con el scroll.
      g.style.translate = 'none'; g.style.scale = 'none'
      const r = g.getBoundingClientRect(), t = box.getBoundingClientRect()
      const dx = t.left + t.width / 2 - (r.left + r.width / 2), dy = t.top + t.height / 2 - (r.top + r.height / 2)
      g.style.translate = `${dx * k}px ${dy * k}px`
      g.style.scale = String(1 + (t.height / 1.3 / r.height - 1) * k)
      g.style.opacity = String(1 - fade); g.style.pointerEvents = fade > 0.5 ? 'none' : ''
    }

    gsap.registerPlugin(ScrollTrigger)
    const lazyRoom = ScrollTrigger.create({ trigger: room, start: 'top bottom+=100%', once: true, onEnter: () => setRoomReady(true) })
    if (reduced) {
      roomProgress.current.enter = 1
      paintParade(0.5); paintGemi(0.5); paintColor(0); paintRincon(1); paintDoor(1)
      // Puerta ya cerrada: Gemi fijo se oculta desde la puerta hasta el final del home.
      const st = ScrollTrigger.create({ trigger: door, start: 'top center', onToggle: self => { const g = gemiNode(); if (g) g.style.visibility = self.isActive || self.progress >= 1 ? 'hidden' : '' }, endTrigger: final, end: 'bottom top' })
      return () => { st.kill(); lazyRoom.kill(); const g = gemiNode(); if (g) g.style.visibility = '' }
    }
    const a = { p: 0 }, b = { q: 0 }, c = { q: 0 }, d = { r: 0 }
    const ctx = gsap.context(() => {
      gsap.to(a, { p: 1, ease: 'none', onUpdate: () => paintParade(within(parade, a.p)), scrollTrigger: { trigger: parade, start: 'top top', end: 'bottom bottom', scrub: SCRUB, invalidateOnRefresh: true } })
      gsap.to(b, { q: 1, ease: 'none', onUpdate: () => paintGemi(within(gemiSection, b.q)), scrollTrigger: { trigger: gemiSection, start: 'top top', end: 'bottom bottom', scrub: SCRUB, invalidateOnRefresh: true } })
      // El cuarto, en su tramo de salida, se disuelve en la niebla (y se va el texto) mientras entra la puerta.
      gsap.to(c, { q: 1, ease: 'none', onUpdate: () => { roomProgress.current.exit = tail(room, c.q); paintRincon(within(room, c.q)) }, scrollTrigger: { trigger: room, start: 'top top', end: 'bottom bottom', scrub: SCRUB, invalidateOnRefresh: true } })
      // El cuarto aparece desde la niebla mientras la sección entra y se vuelve a disolver mientras sale.
      ScrollTrigger.create({ trigger: room, start: 'top bottom', end: 'top top', onUpdate: self => { roomProgress.current.enter = self.progress; invalidate() } })
      gsap.to(d, { r: 1, ease: 'none', onUpdate: () => paintDoor(within(door, d.r)), scrollTrigger: { trigger: door, start: 'top top', end: 'bottom bottom', scrub: SCRUB, invalidateOnRefresh: true } })
    })

    // Un solo snap para todo el home, sobre Lenis. Mientras se scrollea, todo sigue al scroll libremente; cuando el
    // scroll queda quieto ≈200 ms (y no hay un dedo apoyado), la página se desliza sola a la parada siguiente en la
    // dirección del gesto. Las paradas salen de las líneas de tiempo (fracción del tramo fijo de cada sección), así
    // que se recalculan solas si cambia la pantalla o la duración.
    const at = (el: HTMLElement, f: number) => top(el) + run(el) * endOf(el) * f // fracción f de la animación de la sección
    // Cada parada sabe a qué sección pertenece: un salto entre paradas de la misma sección es "interno" (lento) y uno que
    // cambia de sección es "de paso" (rápido). 0 hero · 1 desfile · 2 Gemi · 3 cuarto · 4 puerta · 5 texto final.
    type Stop = { y: number; section: number }
    const stops = (): Stop[] => [
      { y: 0, section: 0 }, // hero: puerta cerrada
      { y: at(parade, PARADE_STOP), section: 1 }, // desfile: la estrella entrando, con el texto visible
      ...[0, 1, 2].map(i => ({ y: at(gemiSection, (i + 0.5) / 3), section: 2 })), // Gemi con cada color
      { y: top(room), section: 3 }, // principio del cuarto (todavía gris): desde Gemi no se saltea la secuencia
      { y: at(room, ROOM_STOP), section: 3 }, // cuarto encendido con el texto
      { y: at(door, DOOR_STOP), section: 4 }, // puerta abierta con Gemi saludando
      { y: at(door, DOOR_CLOSED_STOP), section: 4 }, // puerta cerrada
      { y: top(final), section: 5 }, // texto final (el footer queda libre)
    ]
    let dir = 1, peak = 0, lastY = window.scrollY, lastT = performance.now()
    // Devuelve la parada de destino y la de origen (la que se dejó atrás en la dirección del gesto).
    const chooseStop = (y: number): { to: Stop; from: Stop } | null => {
      const S = stops()
      if (y > S[S.length - 1].y + 2) return null
      // Hero → desfile: un scroll corto y lento vuelve a la puerta cerrada; si pasó el umbral o fue rápido, sigue.
      if (y > S[0].y && y < S[1].y) {
        const span = S[1].y - S[0].y, fast = peak > 1000
        if (dir > 0) return y - S[0].y < span * 0.12 && !fast ? { to: S[0], from: S[1] } : { to: S[1], from: S[0] }
        return S[1].y - y < span * 0.12 && !fast ? { to: S[1], from: S[0] } : { to: S[0], from: S[1] }
      }
      // Resto: la parada más cercana en la dirección del gesto (nunca a mitad de una transición).
      const ahead = dir > 0 ? S.findIndex(s => s.y >= y - 2) : S.map(s => s.y <= y + 2).lastIndexOf(true)
      if (ahead < 0) return null
      const behind = dir > 0 ? S.map(s => s.y < y - 2).lastIndexOf(true) : S.findIndex(s => s.y > y + 2)
      return { to: S[ahead], from: S[behind] ?? S[ahead] }
    }
    // Tipos de salto (distancia d en pantallas; en celular, todo un 20 % más corto):
    // · hero ↔ desfile: como antes, 1 a 3 s (0,48 + 0,87·d), sine.inOut — la apertura de la puerta es parte de la experiencia.
    // · dentro de una sección: 1,2 a 2 s (0,9 + 0,55·d), sine.inOut, despacio.
    // · cambio de sección: 0,6 a 0,9 s (0,5 + 0,2·d), power3.out: arranca decidido y se asienta suave.
    const easeOutCubic = (t: number) => 1 - (1 - t) ** 3
    const snapMotion = (from: Stop, to: Stop, distance: number) => {
      const d = distance / window.innerHeight, clamp = (lo: number, hi: number, v: number) => Math.min(hi, Math.max(lo, v))
      const heroLeg = Math.min(from.section, to.section) === 0 && Math.max(from.section, to.section) === 1
      const motion = heroLeg ? { duration: clamp(1, 3, 0.48 + 0.87 * d), easing: easeInOutSine }
        : from.section === to.section ? { duration: clamp(1.2, 2, 0.9 + 0.55 * d), easing: easeInOutSine }
        : { duration: clamp(0.6, 0.9, 0.5 + 0.2 * d), easing: easeOutCubic }
      return mode.narrow ? { ...motion, duration: motion.duration * 0.8 } : motion
    }

    let snapping = false, programmatic = false, release = 0, idle = 0, touching = false
    const settle = () => {
      const lenis = getLenis()
      if (!lenis || snapping || programmatic || touching) return
      const y = window.scrollY, pick = chooseStop(y)
      peak = 0
      if (!pick || Math.abs(pick.to.y - y) < 2) return
      snapping = true
      lenis.scrollTo(pick.to.y, { ...snapMotion(pick.from, pick.to, Math.abs(pick.to.y - y)), onComplete: () => { snapping = false } })
    }
    const onScroll = () => {
      const now = performance.now(), y = window.scrollY, dy = y - lastY
      if (dy && !snapping) { dir = dy > 0 ? 1 : -1; peak = Math.max(peak, (Math.abs(dy) / Math.max(1, now - lastT)) * 1000) }
      lastY = y; lastT = now
      window.clearTimeout(idle); idle = window.setTimeout(settle, 200)
    }
    // Si el usuario vuelve a scrollear durante el deslizamiento, se cancela al instante (en captura, antes que Lenis
    // procese la rueda) y el control vuelve a él.
    const cancel = () => {
      if (!snapping) return
      snapping = false
      getLenis()?.scrollTo(window.scrollY, { immediate: true, force: true })
    }
    const onTouchStart = () => { touching = true; cancel() }
    const onTouchEnd = () => { touching = false; window.clearTimeout(idle); idle = window.setTimeout(settle, 200) }
    // El snap no corrige los desplazamientos que provoca un clic (círculos de color, links del menú o de anclas).
    const markProgrammatic = () => { programmatic = true; cancel(); window.clearTimeout(release); release = window.setTimeout(() => { programmatic = false }, 2200) }
    const onClick = (e: MouseEvent) => { if ((e.target as Element | null)?.closest('a, .gemi-color')) markProgrammatic() }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('wheel', cancel, { capture: true, passive: true })
    window.addEventListener('keydown', cancel, { capture: true })
    window.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    document.addEventListener('click', onClick, true)
    programmaticRef.current = (done: boolean) => { if (done) { window.clearTimeout(release); programmatic = false } else markProgrammatic() }

    paintParade(0); paintGemi(0); paintRincon(0); paintDoor(0)
    return () => {
      ctx.revert(); lazyRoom.kill(); window.clearTimeout(idle); window.clearTimeout(release); programmaticRef.current = null
      window.removeEventListener('scroll', onScroll); window.removeEventListener('wheel', cancel, { capture: true }); window.removeEventListener('keydown', cancel, { capture: true })
      window.removeEventListener('touchstart', onTouchStart, { capture: true }); window.removeEventListener('touchend', onTouchEnd); document.removeEventListener('click', onClick, true)
      const g = gemiNode(); if (g) { resetGemi(g); g.style.rotate = ''; g.style.visibility = '' }
    }
  }, [mode])

  // Tocar un color lleva el scroll (suave, el de la web) al medio de su tramo, que coincide con una parada del snap;
  // igual el clic se marca como desplazamiento programado y el snap no interviene.
  const goToColor = (i: number) => {
    const section = gemiRef.current
    if (!section || !mode) return
    if (mode.reduced) {
      setActive(i); colorRef.current.set(colors[i].hex); invalidate()
      window.dispatchEvent(new CustomEvent('gemma-product-color', { detail: { hex: colors[i].hex } }))
      return
    }
    // Misma cuenta que las paradas del snap: la animación ocupa el tramo fijo menos la media pantalla de salida.
    const run = section.offsetHeight - window.innerHeight, end = Math.max(0.5, 1 - (0.5 * window.innerHeight) / run)
    const target = section.getBoundingClientRect().top + window.scrollY + run * end * ((i + 0.5) / 3)
    const lenis = getLenis()
    if (!lenis) { window.scrollTo({ top: target, behavior: 'smooth' }); return }
    programmaticRef.current?.(false)
    // Salto dentro de la sección: mismo ritmo lento que el snap interno (1,2 a 2 s, sine.inOut; 20 % menos en celular).
    const seconds = Math.min(2, Math.max(1.2, 0.9 + 0.55 * (Math.abs(target - window.scrollY) / window.innerHeight)))
    lenis.scrollTo(target, { duration: mode.narrow ? seconds * 0.8 : seconds, easing: easeInOutSine, onComplete: () => programmaticRef.current?.(true) })
  }

  return <div className="recorrido">
    <section ref={paradeRef} className="journey journey--parade" aria-label="Objetos de Gemma">
      <div className="journey-sticky">
        {mode && <div ref={canvasRef} className="journey-canvas" style={{ visibility: 'hidden' }}><JourneyScene progress={progress} narrow={mode.narrow} reduced={mode.reduced} /></div>}
        <Squiggles specs={PARADE_SPECS} size={size} paths={paradePaths} />
        <p ref={textRef} className="journey-text">Cada pieza nace de una idea, <em>una capa a la vez.</em></p>
      </div>
    </section>
    <section ref={gemiRef} className="journey journey--gemi" aria-label="Gemi">
      <div className="journey-sticky">
        <Squiggles specs={GEMI_SPECS} size={size} paths={gemiPaths} />
        <p ref={gemiTextRef} className="journey-text journey-text--gemi">Este es Gemi. <em>Le gusta cambiar de color</em> tanto como a vos.</p>
        <div ref={gemi3dRef} className="gemi3d" style={{ opacity: 0 }}>{mode && <GemiScene color={colorRef} live={live} narrow={mode.narrow} reduced={mode.reduced} />}</div>
        <div ref={menuRef} className="gemi-colors" role="group" aria-label="Color de Gemi" style={{ opacity: 0 }}>
          {colors.map((c, i) => <button type="button" key={c.name} className={`gemi-color ${active === i ? 'gemi-color--active' : ''}`} onClick={() => goToColor(i)} aria-label={c.name} aria-pressed={active === i} style={{ '--dot': c.hex } as React.CSSProperties}><span className="gemi-color-dot" /></button>)}
        </div>
      </div>
    </section>
    <section ref={rinconRef} className="journey journey--rincon" aria-label="El rincón se enciende">
      <div className="journey-sticky">
        {mode && roomReady && <div className="journey-canvas room-canvas"><RoomScene progress={roomProgress} narrow={mode.narrow} reduced={mode.reduced} /></div>}
        <Squiggles specs={RINCON_SPECS} size={size} paths={rinconPaths} />
        <p ref={rinconTextRef} className="journey-text journey-text--rincon">Ahora sí <em>quedó lindo.</em></p>
      </div>
    </section>
    <section ref={doorRef} className="journey journey--door" aria-label="Salir por la puerta">
      <div className="journey-sticky">
        {/* La misma puerta corrediza 3D del hero, abierta y con la luz cálida detrás. La caja .exit-door marca dónde va
            (la escena la mide para ubicarla) y es el destino de Gemi fijo. */}
        {mode && roomReady && <div className="exit-door3d" aria-hidden="true"><DoorScene progress={exitDoor} anchor={doorFrameRef} narrow={mode.narrow} /></div>}
        <div className="exit-scene"><div ref={doorFrameRef} className="exit-door" /></div>
        <div ref={washRef} className="exit-wash" aria-hidden="true" />
      </div>
    </section>
    <section ref={finalRef} className="journey-final" aria-label="Cierre">
      <h2 className="section-title journey-final-title">Llevá un poco de <em>Gemma</em> a tu rincón.</h2>
    </section>
  </div>
}
