'use client'

import { Suspense, useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

// Cara del Gemi ilustrado (gemi-sidekick.tsx, viewBox 100×116, gema de y=5 a y=111) llevada al modelo (alto 1,98, centrado):
// cada unidad del SVG mide K en el modelo y el centro del SVG (50, 58) es el origen.
const K = 1.98 / 106
const SWING = (25 * Math.PI) / 180

// Proyecta un punto del SVG sobre la cara frontal de la gema (rayo desde adelante) y devuelve punto y normal.
function makeProjector(scene: THREE.Object3D) {
  scene.updateMatrixWorld(true)
  const meshes: THREE.Object3D[] = []
  scene.traverse(o => { if ((o as THREE.Mesh).isMesh) meshes.push(o) })
  const ray = new THREE.Raycaster()
  return (sx: number, sy: number) => {
    const x = (sx - 50) * K, y = (58 - sy) * K
    ray.set(new THREE.Vector3(x, y, 5), new THREE.Vector3(0, 0, -1))
    const hit = ray.intersectObjects(meshes, false)[0]
    if (!hit?.face) return { point: new THREE.Vector3(x, y, 0.39), normal: new THREE.Vector3(0, 0, 1) }
    return { point: hit.point.clone(), normal: hit.face.normal.clone().transformDirection(hit.object.matrixWorld) }
  }
}

export function buildFace(scene: THREE.Object3D) {
  const project = makeProjector(scene)
  const face = new THREE.Group()
  const Z = new THREE.Vector3(0, 0, 1)
  const disc = new THREE.CylinderGeometry(1, 1, 0.012, 40).rotateX(Math.PI / 2)
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#0F0F10', roughness: 0.35 })
  const mouthMat = new THREE.MeshStandardMaterial({ color: '#0F0F10', roughness: 0.5 })
  // Óvalo chato apoyado sobre la cara, orientado según la normal de la faceta.
  const oval = (cx: number, cy: number, rx: number, ry: number, mat: THREE.Material) => {
    const { point, normal } = project(cx, cy)
    const m = new THREE.Mesh(disc, mat)
    m.scale.set(rx * K, ry * K, 1)
    m.quaternion.setFromUnitVectors(Z, normal)
    m.position.copy(point).addScaledVector(normal, 0.007)
    face.add(m)
  }
  oval(38, 58, 4, 7, eyeMat); oval(62, 58, 4, 7, eyeMat)
  // Boca: la curva "M37 79 Q50 92 63 79" proyectada punto a punto (sigue las facetas), negra y fina como una línea dibujada.
  const radius = 0.55 * K
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= 16; i++) {
    const t = i / 16, u = 1 - t
    const { point, normal } = project(u * u * 37 + 2 * u * t * 50 + t * t * 63, u * u * 79 + 2 * u * t * 92 + t * t * 79)
    pts.push(point.addScaledVector(normal, radius + 0.002))
  }
  face.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, radius, 10), mouthMat))
  const cap = new THREE.SphereGeometry(radius, 12, 8)
  for (const p of [pts[0], pts[pts.length - 1]]) { const c = new THREE.Mesh(cap, mouthMat); c.position.copy(p); face.add(c) }
  return face
}

function GemiModel({ color, reduced }: { color: MutableRefObject<THREE.Color>; reduced: boolean }) {
  const gltf = useLoader(GLTFLoader, '/modelos/gemi.glb', loader => loader.setMeshoptDecoder(MeshoptDecoder))
  const { scene, body } = useMemo(() => {
    const scene = gltf.scene.clone(true)
    let body: THREE.MeshStandardMaterial | null = null
    // Material propio: el Gemi del desfile comparte el modelo cacheado y no debe cambiar de color.
    scene.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh && (m.material as THREE.Material).name === 'gemi-body') { body = (m.material as THREE.MeshStandardMaterial).clone(); m.material = body } })
    scene.add(buildFace(scene)) // hija del modelo: se balancea con él y no cambia de color
    return { scene, body: body as THREE.MeshStandardMaterial | null }
  }, [gltf])
  const group = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (body) body.color.copy(color.current)
    // Balanceo suave de ±25° para que la cara siempre se vea.
    if (group.current) group.current.rotation.y = reduced ? 0 : Math.sin(clock.elapsedTime * 0.8) * SWING
  })
  return <group ref={group}><primitive object={scene} /></group>
}

export default function GemiScene({ color, live, narrow, reduced }: { color: MutableRefObject<THREE.Color>; live: boolean; narrow: boolean; reduced: boolean }) {
  return <Canvas
    frameloop={live && !reduced ? 'always' : 'demand'}
    dpr={narrow ? [1, 1.5] : [1, 2]}
    gl={{ antialias: true, alpha: true, powerPreference: narrow ? 'low-power' : 'high-performance' }}
    camera={{ position: [0, 0, 4.8], fov: 30 }}
    aria-hidden="true"
  >
    <ambientLight intensity={1.1} />
    <hemisphereLight args={['#fff1d9', '#ffd8a8', 0.9]} />
    <directionalLight position={[3, 4, 5]} intensity={2.4} />
    <directionalLight position={[-4, 1, 2]} intensity={0.8} color="#ffe2c2" />
    <Suspense fallback={null}><GemiModel color={color} reduced={reduced} /></Suspense>
  </Canvas>
}
