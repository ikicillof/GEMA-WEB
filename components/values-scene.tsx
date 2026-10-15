'use client'

import { useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { VALUES } from '@/lib/about-data'

// Los cinco valores como objetos 3D armados con código, de acabado mate tipo gomita. Cámara ortográfica en píxeles: cada objeto se
// ubica y se escala sobre su casillero del HTML (el botón .value-slot), así el diseño responsive lo resuelve el CSS (fila de 5
// en escritorio, grilla de 2 columnas en celular) y el 3D lo sigue. Nada de esto depende del scroll salvo la aparición.
type Refs = {
  slots: MutableRefObject<(HTMLElement | null)[]>
  kick: MutableRefObject<number[]> // segundos (performance.now()/1000) del último toque o hover de cada objeto
  active: MutableRefObject<number>
  go: MutableRefObject<number> // instante en que la sección entró en pantalla (0 = todavía no)
}
type Props = Refs & { narrow: boolean; reduced: boolean; live: boolean }
type Part = { geo: THREE.BufferGeometry; color: string; pos?: [number, number, number] }

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const easeOutBack = (t: number) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2) }

// Polígono con las esquinas redondeadas (para estrellas y techos "gorditos").
function roundedShape(pts: [number, number][], r: number) {
  const s = new THREE.Shape(), n = pts.length
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n]
    const dir = (a: [number, number], b: [number, number]) => { const dx = a[0] - b[0], dy = a[1] - b[1], l = Math.hypot(dx, dy); return [dx / l, dy / l] }
    const d1 = dir(p0, p1), d2 = dir(p2, p1), k = Math.min(r, Math.hypot(p0[0] - p1[0], p0[1] - p1[1]) / 2.2, Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 2.2)
    const a = [p1[0] + d1[0] * k, p1[1] + d1[1] * k], b = [p1[0] + d2[0] * k, p1[1] + d2[1] * k]
    if (i === 0) s.moveTo(a[0], a[1]); else s.lineTo(a[0], a[1])
    s.quadraticCurveTo(p1[0], p1[1], b[0], b[1])
  }
  s.closePath(); return s
}
// Extruye con un bisel grande: así queda "mullido", como un globo.
function puffy(shape: THREE.Shape, depth = 0.22, bevel = 0.14) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.85, bevelSegments: 8, curveSegments: 14 })
  g.center(); return g
}
function normalize(g: THREE.BufferGeometry, size = 1) {
  g.computeBoundingBox(); const b = g.boundingBox!, m = Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z)
  g.scale(size / m, size / m, size / m); return g
}

function buildParts(shape: string, narrow: boolean): Part[] {
  const seg = narrow ? 2 : 4
  if (shape === 'star') {
    const pts: [number, number][] = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.55 : 1; return [Math.cos(a) * r, Math.sin(a) * r] })
    return [{ geo: normalize(puffy(roundedShape(pts, 0.32), 0.18, 0.16)), color: '#FFD93D' }]
  }
  if (shape === 'heart') {
    const s = new THREE.Shape()
    for (let i = 0; i <= 72; i++) { const t = (i / 72) * Math.PI * 2, x = 16 * Math.sin(t) ** 3 / 17, y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17; if (i) s.lineTo(x, y); else s.moveTo(x, y) }
    return [{ geo: normalize(puffy(s, 0.2, 0.17)), color: '#FF4DA6' }]
  }
  if (shape === 'spiral') {
    // Firulete en espiral: un tubo grueso de puntas redondas.
    const pts = Array.from({ length: 90 }, (_, i) => { const t = i / 89, a = t * Math.PI * 2 * 2.6, r = 0.1 + t * 0.62; return new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, Math.sin(t * Math.PI) * 0.05) })
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), narrow ? 90 : 180, 0.1, narrow ? 8 : 14)
    const cap = new THREE.SphereGeometry(0.1, 16, 12)
    const merged = [tube, cap.clone().translate(pts[0].x, pts[0].y, pts[0].z), cap.clone().translate(pts[89].x, pts[89].y, pts[89].z)]
    const g = new THREE.BufferGeometry()
    const pos: number[] = [], nor: number[] = [], idx: number[] = []
    let base = 0
    merged.forEach(m => { const p = m.getAttribute('position'), n = m.getAttribute('normal'); for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)) } const ix = m.getIndex(); if (ix) for (let i = 0; i < ix.count; i++) idx.push(ix.getX(i) + base); base += p.count })
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx)
    g.center(); return [{ geo: normalize(g), color: '#6D28D9' }]
  }
  if (shape === 'drop') {
    // Gota: perfil de revolución (panza redonda abajo, punta suave arriba).
    const prof: THREE.Vector2[] = []
    for (let i = 0; i <= 14; i++) { const a = -Math.PI / 2 + (i / 14) * (Math.PI * 0.82); prof.push(new THREE.Vector2(Math.max(0.0001, Math.cos(a) * 0.5), -0.15 + Math.sin(a) * 0.5)) }
    const last = prof[prof.length - 1]
    for (let i = 1; i <= 10; i++) { const t = i / 10; prof.push(new THREE.Vector2(Math.max(0.012, last.x * (1 - t) ** 1.25), last.y + t * 0.62)) }
    return [{ geo: normalize(new THREE.LatheGeometry(prof, narrow ? 28 : 48)), color: '#00E6D2' }]
  }
  // house: casita redondeada (cuerpo + techo de otro rosa + puerta)
  const roof = roundedShape([[-0.66, 0], [0.66, 0], [0, 0.56]], 0.16)
  const roofGeo = new THREE.ExtrudeGeometry(roof, { depth: 0.9, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 5, curveSegments: 10 }); roofGeo.translate(0, 0, -0.45)
  return [
    { geo: new RoundedBoxGeometry(1.02, 0.74, 0.86, seg, 0.14), color: '#FFB4D8', pos: [0, -0.2, 0] },
    { geo: roofGeo, color: '#FF83C2', pos: [0, 0.14, 0] },
    { geo: new RoundedBoxGeometry(0.24, 0.4, 0.08, 2, 0.05), color: '#FFF3E4', pos: [0, -0.37, 0.43] },
  ]
}

function Objects({ slots, kick, active, go, narrow, reduced }: Props) {
  const { gl } = useThree()
  const built = useMemo(() => VALUES.map(v => {
    const parts = buildParts(v.shape, narrow)
    // Mate, con un poco de brillo propio para que el color no se apague en las caras en sombra.
    const mats = parts.map(p => new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.82, metalness: 0, emissive: new THREE.Color(p.color).multiplyScalar(0.16) }))
    return { parts, mats, house: v.shape === 'house' }
  }), [narrow])
  const groups = useRef<(THREE.Group | null)[]>([])
  const spin = useRef(VALUES.map(() => ({ cur: 0, target: 0, last: 0 })))

  useFrame(({ clock, size }, delta) => {
    const cv = gl.domElement.getBoundingClientRect(), now = performance.now() / 1000, t = clock.elapsedTime
    built.forEach((o, i) => {
      const g = groups.current[i], el = slots.current[i]
      if (!g || !el) return
      const r = el.getBoundingClientRect()
      const px = Math.min(r.width, r.height) * (o.house ? 0.5 : 0.7) // tamaño del objeto en píxeles
      const born = go.current ? clamp01((now - go.current - i * 0.12) / 0.7) : 0
      const appear = reduced ? 1 : Math.max(0, easeOutBack(born)) * (born > 0 ? 1 : 0)
      // Toque / hover: rebota (squash & stretch + saltito) y gira un poco.
      const k = kick.current[i] ?? 0, u = reduced || !k ? 1 : clamp01((now - k) / 0.9)
      const sp = spin.current[i]
      if (!reduced && k && k !== sp.last) { sp.last = k; sp.target += 2.1 }
      sp.cur += (sp.target - sp.cur) * (1 - Math.exp(-delta * 6))
      const bounce = u < 1 ? Math.sin(u * Math.PI * 3) * (1 - u) * 0.2 : 0
      const hop = u < 1 ? Math.abs(Math.sin(u * Math.PI * 2)) * (1 - u) * px * 0.22 : 0
      const sway = reduced ? 0 : Math.sin(t * 0.9 + i * 1.3)
      const float = reduced ? 0 : Math.sin(t * 1.1 + i * 1.7) * px * 0.05
      const hl = active.current === i ? 0.07 : 0
      g.position.set(r.left + r.width / 2 - cv.left - size.width / 2, -(r.top + r.height / 2 - cv.top - size.height / 2) + float + hop, 0)
      g.scale.set(px * appear * (1 + hl + bounce), px * appear * (1 + hl - bounce * 0.6), px * appear * (1 + hl + bounce))
      g.rotation.set(0.18 + sway * 0.06, sp.cur + (reduced ? 0.35 : Math.sin(t * 0.7 + i) * 0.28), sway * 0.07)
      g.visible = appear > 0.001
    })
  })

  return <>{built.map((o, i) => <group key={i} ref={el => { groups.current[i] = el }} visible={false}>
    {o.parts.map((p, j) => <mesh key={j} geometry={p.geo} material={o.mats[j]} position={p.pos} />)}
  </group>)}</>
}

export default function ValuesScene(props: Props) {
  return <Canvas
    orthographic
    frameloop={props.live && !props.reduced ? 'always' : 'demand'}
    dpr={props.narrow ? [1, 1.25] : [1, 1.75]}
    gl={{ antialias: !props.narrow, alpha: true, powerPreference: props.narrow ? 'low-power' : 'high-performance' }}
    camera={{ zoom: 1, position: [0, 0, 800], near: 1, far: 2000 }}
    aria-hidden="true"
  >
    <hemisphereLight args={['#fff4e6', '#e7bad2', 1.5]} />
    <directionalLight position={[220, 360, 600]} intensity={1.7} />
    <Objects {...props} />
  </Canvas>
}
