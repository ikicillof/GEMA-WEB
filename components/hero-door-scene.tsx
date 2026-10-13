'use client'

import { Suspense, useMemo, useRef } from 'react'
import type { MutableRefObject, RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Puerta3D, PUERTA } from './puerta-3d'

// Progreso del hero que escribe la línea de tiempo de gemma-experience: open (0 cerrada → 1 abierta) y
// dolly (0 → 1: la cámara avanza y atraviesa el paso).
export type HeroDoorProgress = { open: number; dolly: number }

const FOV = 32
const MARGIN = 1.06 // la puerta ocupa casi todo el ancho de su columna

// Texturas de luz con alfa que llega a 0 en todos los bordes: nunca se ve un corte recto ni un recuadro.
function radialGlow(stops: [number, string][]) {
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d')!, grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  stops.forEach(([at, color]) => grad.addColorStop(at, color))
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}
// Haz del paso: más intenso en el centro, se apaga hacia los costados y también arriba y abajo.
function shaftGlow() {
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d')!
  const across = g.createLinearGradient(0, 0, 128, 0)
  across.addColorStop(0, 'rgba(255,205,140,0)'); across.addColorStop(0.5, 'rgba(255,218,165,.9)'); across.addColorStop(1, 'rgba(255,205,140,0)')
  g.fillStyle = across; g.fillRect(0, 0, 128, 128)
  const along = g.createLinearGradient(0, 0, 0, 128)
  along.addColorStop(0, 'rgba(0,0,0,0)'); along.addColorStop(0.18, 'rgba(0,0,0,1)'); along.addColorStop(0.85, 'rgba(0,0,0,1)'); along.addColorStop(1, 'rgba(0,0,0,0)')
  g.globalCompositeOperation = 'destination-in'; g.fillStyle = along; g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}
// Hueco interior del marco, donde hay vidrio o paso (medido en el modelo: x ±1,22 m, y de 0,09 a 2,24 m; el cuerpo del
// marco llega a ±1,28 m y solo el riel sigue hasta ±1,74 m). El degradado se apaga a 0 en el borde: nunca asoma afuera.
const HOLE = { w: 2.44, h: 2.15, y: 1.165 }

// La puerta se ubica en el lugar que ocupaba la puerta SVG (la columna .portal-art), midiéndola en pantalla;
// la cámara mira de frente y, al final, avanza hasta atravesar el paso.
function Stage({ progress, anchor }: { progress: MutableRefObject<HeroDoorProgress>; anchor: RefObject<HTMLElement> }) {
  const { camera, size, gl } = useThree()
  const door = useRef<THREE.Group>(null), shaft = useRef<THREE.Mesh>(null), front = useRef<THREE.PointLight>(null)
  const open = useRef(0)
  const v = useMemo(() => ({ from: new THREE.Vector3(), to: new THREE.Vector3(), look: new THREE.Vector3() }), [])
  const backTex = useMemo(() => radialGlow([[0, 'rgba(255,241,217,1)'], [0.55, 'rgba(255,220,172,.9)'], [0.86, 'rgba(255,195,125,.45)'], [1, 'rgba(255,180,110,0)']]), [])
  const haloTex = useMemo(() => radialGlow([[0, 'rgba(255,200,140,.14)'], [0.5, 'rgba(255,190,130,.05)'], [1, 'rgba(255,190,130,0)']]), [])
  const shaftTex = useMemo(() => shaftGlow(), [])

  useFrame(() => {
    const el = anchor.current, cam = camera as THREE.PerspectiveCamera
    if (!el || !door.current) return
    const canvas = gl.domElement.getBoundingClientRect(), art = el.getBoundingClientRect()
    // Escala: la puerta (con un margen) llena el ancho de la columna; de ahí sale la distancia de la cámara.
    const pxPerUnit = art.width / (PUERTA.width * MARGIN)
    const dist = (size.height / pxPerUnit) / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2))
    const x0 = (art.left + art.width / 2 - canvas.left - size.width / 2) / pxPerUnit
    const y0 = (size.height / 2 - (art.bottom - canvas.top)) / pxPerUnit
    door.current.position.set(x0, y0, 0)
    // Avance: desde el frente hasta un poco detrás del umbral, pasando por el medio del paso.
    const { open: o, dolly } = progress.current
    open.current = o
    v.from.set(0, 0, dist); v.to.set(x0, y0 + PUERTA.height * 0.48, -1.2)
    cam.position.lerpVectors(v.from, v.to, dolly * dolly * (3 - 2 * dolly))
    cam.lookAt(v.look.set(cam.position.x, cam.position.y, cam.position.z - 1))
    // La luz cálida entra por la abertura del centro y se ensancha a medida que se abren las hojas.
    // Nunca más ancho que el paso abierto, así no se pinta sobre el marco.
    if (shaft.current) { shaft.current.scale.x = Math.max(0.001, PUERTA.gap * o); (shaft.current.material as THREE.MeshBasicMaterial).opacity = Math.min(1, o * 1.6) }
    if (front.current) front.current.intensity = 0.6 + o * 5
  })

  return <group ref={door}>
    {/* Halo exterior muy sutil, circular y totalmente difuso (nunca forma un rectángulo). */}
    <mesh position={[0, HOLE.y, -0.4]} scale={[PUERTA.width * 1.5, PUERTA.width * 1.5, 1]}><planeGeometry /><meshBasicMaterial map={haloTex} transparent depthWrite={false} toneMapped={false} /></mesh>
    {/* Luz cálida de adentro: del tamaño exacto del hueco del marco, pegada detrás de las hojas, con un degradado radial
        que se apaga hacia los bordes. Solo se ve a través de la puerta (vidrios y paso), nunca por fuera del marco. */}
    <mesh position={[0, HOLE.y, -0.09]}><planeGeometry args={[HOLE.w, HOLE.h]} /><meshBasicMaterial map={backTex} transparent depthWrite={false} toneMapped={false} /></mesh>
    <pointLight position={[0, 1.2, -0.4]} color="#FFC27A" intensity={4} distance={4} decay={1.5} />
    <Suspense fallback={null}><Puerta3D open={open} /></Suspense>
    {/* Haz del paso: del alto del paso (hasta el riel de arriba, ≈ 1,95 m). */}
    <mesh ref={shaft} position={[0, 0.99, 0.1]}><planeGeometry args={[1, 1.94]} /><meshBasicMaterial map={shaftTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} opacity={0} /></mesh>
    <pointLight ref={front} position={[0, 1.1, 0.9]} color="#FFB677" intensity={0.6} distance={5} decay={1.5} />
  </group>
}

export default function HeroDoorScene({ progress, anchor, narrow }: { progress: MutableRefObject<HeroDoorProgress>; anchor: RefObject<HTMLElement>; narrow: boolean }) {
  return <Canvas
    frameloop="demand"
    dpr={narrow ? [1, 1.25] : [1, 2]}
    gl={{ antialias: true, alpha: true, powerPreference: narrow ? 'low-power' : 'high-performance' }}
    camera={{ position: [0, 0, 10], fov: FOV, near: 0.05, far: 60 }}
    aria-hidden="true"
  >
    <hemisphereLight args={['#fff4e6', '#4a2a3a', 1.2]} />
    <directionalLight position={[2, 3, 5]} intensity={1.4} />
    <Stage progress={progress} anchor={anchor} />
  </Canvas>
}
