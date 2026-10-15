'use client'

import { Suspense, useEffect, useMemo, useRef } from 'react'
import type { MutableRefObject, RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Puerta3D, PUERTA } from './puerta-3d'

// Misma puerta del hero (mismos materiales). El canvas cubre toda la sección y la puerta se ubica sobre el recuadro
// .nf-canvas (midiéndolo en pantalla, como el hero); al salir la cámara avanza y atraviesa el paso hacia el vacío.
const FOV = 32
const MARGIN = 1.1 // la puerta ocupa casi todo el ancho de su recuadro
// Hueco interior del marco (mismas medidas que en hero-door-scene).
const HOLE = { w: 2.44, h: 2.15, y: 1.165 }
const STAR_COLORS = ['#FFFFFF', '#FFD93D', '#FFB4DB', '#00E6D2', '#FFFFFF']

function starTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64
  const g = c.getContext('2d')!
  const glow = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  glow.addColorStop(0, 'rgba(255,255,255,.55)'); glow.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = glow; g.fillRect(0, 0, 64, 64)
  g.fillStyle = '#fff'; g.beginPath()
  g.moveTo(32, 6); g.quadraticCurveTo(35, 29, 58, 32); g.quadraticCurveTo(35, 35, 32, 58); g.quadraticCurveTo(29, 35, 6, 32); g.quadraticCurveTo(29, 29, 32, 6)
  g.fill()
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}
function rng(seed: number) { return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

// Lo que hay del otro lado: con la puerta cerrada se ve la luz cálida de siempre; al abrir se apaga en un vacío grafito
// con estrellitas sueltas que titilan.
function Vacio({ open, count, still }: { open: MutableRefObject<number>; count: number; still: boolean }) {
  const back = useRef<THREE.MeshBasicMaterial>(null)
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([])
  const tex = useMemo(starTexture, [])
  const warm = useMemo(() => new THREE.Color('#FFE7C4'), []), dark = useMemo(() => new THREE.Color('#0F0F10'), [])
  const stars = useMemo(() => {
    const r = rng(404)
    return Array.from({ length: count }, () => ({ x: (r() - 0.5) * (HOLE.w - 0.16), y: HOLE.y + (r() - 0.5) * (HOLE.h - 0.16), size: 0.05 + r() * 0.1, phase: r() * 6.28, speed: 1.3 + r() * 2.4, color: STAR_COLORS[Math.floor(r() * STAR_COLORS.length)] }))
  }, [count])
  useFrame(({ clock }) => {
    const o = Math.min(1, Math.max(0, open.current)), e = o * o * (3 - 2 * o)
    back.current?.color.lerpColors(warm, dark, e)
    stars.forEach((s, i) => {
      const m = mats.current[i]
      if (m) m.opacity = e * e * (still ? 0.85 : 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * s.speed + s.phase)))
    })
  })
  return <>
    <mesh position={[0, HOLE.y, -0.09]}><planeGeometry args={[HOLE.w, HOLE.h]} /><meshBasicMaterial ref={back} color="#FFE7C4" toneMapped={false} /></mesh>
    {stars.map((s, i) => <mesh key={i} position={[s.x, s.y, -0.08]}><planeGeometry args={[s.size * 2, s.size * 2]} /><meshBasicMaterial ref={el => { mats.current[i] = el }} map={tex} color={s.color} transparent opacity={0} depthWrite={false} toneMapped={false} /></mesh>)}
  </>
}

// Se monta recién cuando el modelo de la puerta terminó de cargar (comparte el límite de Suspense).
function Listo({ onReady }: { onReady: () => void }) { useEffect(onReady, [onReady]); return null }

type SceneProps = { open: MutableRefObject<number>; dolly: MutableRefObject<number>; anchor: RefObject<HTMLElement>; mobile: boolean; still: boolean; onReady: () => void }

function Stage({ open, dolly, anchor, mobile, still, onReady }: SceneProps) {
  const { camera, size, gl } = useThree()
  const door = useRef<THREE.Group>(null), fill = useRef<THREE.Mesh>(null)
  const v = useMemo(() => ({ from: new THREE.Vector3(), to: new THREE.Vector3(), look: new THREE.Vector3() }), [])
  useFrame(() => {
    const el = anchor.current, cam = camera as THREE.PerspectiveCamera
    if (!el || !door.current) return
    const canvas = gl.domElement.getBoundingClientRect(), art = el.getBoundingClientRect()
    const pxPerUnit = art.width / (PUERTA.width * MARGIN)
    const dist = (size.height / pxPerUnit) / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2))
    const floor = art.bottom - art.height * 0.054
    const x0 = (art.left + art.width / 2 - canvas.left - size.width / 2) / pxPerUnit
    const y0 = (size.height / 2 - (floor - canvas.top)) / pxPerUnit
    door.current.position.set(x0, y0, 0)
    // Zoom hacia la puerta: desde el frente hasta un poco detrás del umbral, por el medio del paso.
    const d = dolly.current
    v.from.set(0, 0, dist); v.to.set(x0, y0 + PUERTA.height * 0.48, -1.2)
    cam.position.lerpVectors(v.from, v.to, d)
    cam.lookAt(v.look.set(cam.position.x, cam.position.y, cam.position.z - 1))
    if (fill.current) fill.current.visible = d > 0.7 // una vez adentro, todo es vacío grafito
  })
  return <group ref={door}>
    <Vacio open={open} count={mobile ? 14 : 38} still={still} />
    <mesh ref={fill} position={[0, 1.165, -0.12]} visible={false}><planeGeometry args={[60, 60]} /><meshBasicMaterial color="#0F0F10" side={THREE.DoubleSide} toneMapped={false} /></mesh>
    <Suspense fallback={null}><Puerta3D open={open} /><Listo onReady={onReady} /></Suspense>
  </group>
}

export default function NotFoundScene(props: SceneProps) {
  return <Canvas
    frameloop={props.still ? 'demand' : 'always'}
    dpr={props.mobile ? [1, 1.25] : [1, 2]}
    gl={{ antialias: true, alpha: true, powerPreference: props.mobile ? 'low-power' : 'high-performance' }}
    camera={{ position: [0, 0, 10], fov: FOV, near: 0.05, far: 80 }}
    aria-hidden="true"
  >
    <hemisphereLight args={['#fff4e6', '#4a2a3a', 1.2]} />
    <directionalLight position={[2, 3, 5]} intensity={1.4} />
    <Stage {...props} />
  </Canvas>
}
