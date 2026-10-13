'use client'

import { Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { buildFace } from './gemi-scene'

type Progress = MutableRefObject<number>
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

// Desfile: orden de aparición, mitad de alto del modelo (lado mayor = 2) y ventana de scroll de cada uno.
const MODELS = [
  { url: '/modelos/perro-globo.glb', half: 0.86 },
  { url: '/modelos/gemi.glb', half: 0.99 },
  { url: '/modelos/giallo-luma.glb', half: 0.91 },
]
const WINDOW = 0.7, STAGGER = 0.15, HEAD_START = 0.08 // el primero ya viene entrando apenas empieza el scroll
// Para el snap: la línea de tiempo del desfile (el objeto i recorre la pantalla con t = (p - i·STAGGER) / WINDOW + HEAD_START).
export const PARADE_TIMING = { WINDOW, STAGGER, HEAD_START }

function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d')!, grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(60,30,20,.55)'); grad.addColorStop(.55, 'rgba(60,30,20,.18)'); grad.addColorStop(1, 'rgba(60,30,20,0)')
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}

function Model({ index, progress, narrow, reduced, shadow }: { index: number; progress: Progress; narrow: boolean; reduced: boolean; shadow: THREE.Texture }) {
  const { url, half } = MODELS[index]
  const gltf = useLoader(GLTFLoader, url, loader => loader.setMeshoptDecoder(MeshoptDecoder))
  const scene = useMemo(() => {
    const s = gltf.scene.clone(true)
    if (url.endsWith('gemi.glb')) s.add(buildFace(s)) // la misma cara que el Gemi de la sección 2
    return s
  }, [gltf, url])
  const { viewport } = useThree()
  const root = useRef<THREE.Group>(null), spin = useRef<THREE.Group>(null), blob = useRef<THREE.Mesh>(null)
  const scale = narrow ? 0.62 : 0.95
  const y = narrow ? -0.05 : -0.3

  const place = () => {
    if (!root.current || !spin.current || !blob.current) return
    const reach = viewport.width / 2 + 1.7 * scale + 0.4
    let x: number, turn: number
    if (reduced) {
      x = (index - 1) * Math.min(viewport.width / 3, 3.2); turn = 0.5
    } else {
      const t = clamp01((progress.current - index * STAGGER) / WINDOW + HEAD_START)
      x = reach - t * 2 * reach; turn = t * Math.PI * 3.2
    }
    root.current.position.set(x, y, 0)
    spin.current.rotation.y = turn
    blob.current.position.y = -half * scale - 0.04
  }
  // Al montar (y al cambiar el tamaño) se coloca ya en su sitio: con frameloop "demand" no hay otro cuadro hasta el próximo scroll.
  useLayoutEffect(place)
  useFrame(place)

  return <group ref={root}>
    <group ref={spin} scale={scale}><primitive object={scene} /></group>
    <mesh ref={blob} rotation={[-Math.PI / 2, 0, 0]} scale={[2.6 * scale, 1.5 * scale, 1]}>
      <planeGeometry args={[1, 1]} /><meshBasicMaterial map={shadow} transparent depthWrite={false} />
    </mesh>
  </group>
}

export default function JourneyScene({ progress, narrow, reduced }: { progress: Progress; narrow: boolean; reduced: boolean }) {
  const shadow = useMemo(() => shadowTexture(), [])
  return <Canvas
    frameloop="demand"
    dpr={narrow ? [1, 1.25] : [1, 2]}
    gl={{ antialias: !narrow, alpha: true, powerPreference: narrow ? 'low-power' : 'high-performance' }}
    camera={{ position: [0, 0, 6], fov: 35 }}
    aria-hidden="true"
  >
    <ambientLight intensity={1.15} />
    <hemisphereLight args={['#fff1d9', '#ffd8a8', 0.9]} />
    <directionalLight position={[3, 5, 4]} intensity={2.4} />
    <directionalLight position={[-4, 2, 2]} intensity={0.8} color="#ffe2c2" />
    <Suspense fallback={null}>{MODELS.map((_, i) => <Model key={i} index={i} progress={progress} narrow={narrow} reduced={reduced} shadow={shadow} />)}</Suspense>
  </Canvas>
}
