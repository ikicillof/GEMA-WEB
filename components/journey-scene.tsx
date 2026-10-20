'use client'

import { Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { buildFace } from './gemi-scene'

type Progress = MutableRefObject<number>
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

// Desfile: orden de aparición, mitad de alto del modelo (lado mayor = 2) y ventana de scroll de cada uno.
const MODELS = [
  { url: '/modelos/perro-globo.glb', half: 0.86 },
  { url: '/modelos/gemi.glb', half: 0.99 },
  { url: '/modelos/giallo-luma.glb', half: 0.91 },
]
import { PARADE_TIMING } from './journey-timing'
const { WINDOW, STAGGER, HEAD_START } = PARADE_TIMING
// Para el snap: la línea de tiempo del desfile (el objeto i recorre la pantalla con t = (p - i·STAGGER) / WINDOW + HEAD_START).
export { PARADE_TIMING } from './journey-timing'

function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d')!, grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(60,30,20,.55)'); grad.addColorStop(.55, 'rgba(60,30,20,.18)'); grad.addColorStop(1, 'rgba(60,30,20,0)')
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}

// El Perro Globo vino de SketchUp y se redujo de 126.000 a ~20.000 caras: sus normales (cuantizadas) dejaban parches con luz. Acá se
// descartan los atributos del original (normales, UV, colores), se sueldan los vértices duplicados y se recalculan normales suaves:
// la luz pasa pareja de un globo al otro y no hay ningún color por vértice ni textura, solo el material único.
function smoothDog(source: THREE.BufferGeometry) {
  const src = source.getAttribute('position')
  const flat = new Float32Array(src.count * 3)
  for (let i = 0; i < src.count; i++) { flat[i * 3] = src.getX(i); flat[i * 3 + 1] = src.getY(i); flat[i * 3 + 2] = src.getZ(i) }
  let g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(flat, 3)); if (source.index) g.setIndex(source.index.clone())
  g = mergeVertices(g, 1e-4)
  g.computeVertexNormals()
  return g
}

function Model({ index, progress, narrow, reduced, shadow }: { index: number; progress: Progress; narrow: boolean; reduced: boolean; shadow: THREE.Texture }) {
  const { url, half } = MODELS[index]
  const gltf = useLoader(GLTFLoader, url, loader => loader.setMeshoptDecoder(MeshoptDecoder))
  const scene = useMemo(() => {
    const s = gltf.scene.clone(true)
    if (url.endsWith('gemi.glb')) s.add(buildFace(s)) // la misma cara que el Gemi de la sección 2
    if (url.endsWith('perro-globo.glb')) {
      // Un solo azul medio oscuro y liso, en el mismo tipo de material que Gemi y la estrella (MeshStandardMaterial, mate tipo gomita):
      // sin reflejos (metalness 0, roughness alto, poco entorno), sin vertexColors y sin mapas. Un único material para todas sus mallas.
      const blue = new THREE.MeshStandardMaterial({ color: '#2B4DB8', roughness: 0.6, metalness: 0, envMapIntensity: 0.3 })
      s.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry = smoothDog(m.geometry); m.material = blue } })
    }
    // Los tres proyectan y reciben sombra (la luz principal las genera): las patas y la cabeza sombrean al cuerpo mientras gira.
    s.traverse(o => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true } })
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
    shadows="soft"
    dpr={narrow ? [1, 1.25] : [1, 2]}
    gl={{ antialias: !narrow, alpha: true, powerPreference: narrow ? 'low-power' : 'high-performance' }}
    camera={{ position: [0, 0, 6], fov: 35 }}
    aria-hidden="true"
  >
    <ambientLight intensity={1.15} />
    <hemisphereLight args={['#fff1d9', '#ffd8a8', 0.9]} />
    <directionalLight position={[3, 5, 4]} intensity={2.4} castShadow shadow-mapSize={narrow ? [1024, 1024] : [2048, 2048]} shadow-camera-left={-6.5} shadow-camera-right={6.5} shadow-camera-top={3} shadow-camera-bottom={-3} shadow-camera-near={1} shadow-camera-far={16} shadow-bias={-0.0005} shadow-normalBias={0.02} />
    <directionalLight position={[-4, 2, 2]} intensity={0.8} color="#ffe2c2" />
    <Suspense fallback={null}>{MODELS.map((_, i) => <Model key={i} index={i} progress={progress} narrow={narrow} reduced={reduced} shadow={shadow} />)}</Suspense>
  </Canvas>
}
