'use client'

import { Suspense, useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { buildFace } from './gemi-scene'

// Progreso de la sección 3 (0 a 1) que escribe home-journey. enter/exit: cuánto entró la sección a la pantalla
// y cuánto se fue; con eso el cuarto aparece desde la niebla y se vuelve a disolver.
export type RoomProgress = { rincon: number; enter: number; exit: number }

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const ease = (t: number) => t * t * (3 - 2 * t)
type V3 = [number, number, number]

// Mismo crema que el fondo del recorrido (--fondo-gemma): el canvas es transparente y la niebla funde los bordes en él.
const FOG = '#FFF4E6'

// Secuencia (q de la sección 3): cada objeto cae (0,1 de q), rebota y lanza su onda de color.
// 0 perro → muebles y puerta · 1 Gemi → paredes · 2 estrella → piso. Al final, brillo de la estrella y acercamiento.
const LANDINGS = [0.16, 0.38, 0.6]
const WAVE = 0.18, MAX_RADIUS = 6
const GLOW = [0.78, 0.88], ZOOM = [0.8, 0.95]

// Colores de la paleta: muebles más vivos; paredes y piso en tonos suaves que combinan con ellos.
const GROUPS: Record<string, { wave: 0 | 1 | 2; colors: [string, string][]; fallback: string }> = {
  Muebles: {
    wave: 0, fallback: '#FF4DA6',
    colors: [['escritorio', '#00E6D2'], ['silla', '#FF4DA6'], ['monitor', '#6D28D9'], ['pantalla', '#6D28D9'], ['teclado', '#6D28D9'], ['cama', '#6D28D9'],
      ['colchon', '#FFF1D9'], ['almohada', '#FFD93D'], ['mesa-de-luz', '#FF4DA6'], ['lampara', '#FFD93D'], ['tacho', '#00E6D2'], ['ventilador', '#6D28D9']],
  },
  Puerta: { wave: 0, fallback: '#FF4DA6', colors: [['picaporte', '#FFD93D']] },
  Paredes: { wave: 1, fallback: '#FFD6E8', colors: [['ventana', '#FFF6EC'], ['cuadro', '#BFF5EF']] },
  Piso: { wave: 2, fallback: '#FFE4C4', colors: [['alfombra', '#D9C8F7']] },
}

// Objetos que caen, en orden, sobre los puntos de apoyo del cuarto. h = alto en metros; turn = giro extra.
const ITEMS = [
  { url: '/modelos/perro-globo.glb', half: 0.86, apoyo: 'apoyo-perro', h: 0.32, turn: -0.3 },
  { url: '/modelos/gemi.glb', half: 0.99, apoyo: 'apoyo-gemi', h: 0.3, turn: 0 },
  { url: '/modelos/giallo-luma.glb', half: 0.91, apoyo: 'apoyo-estrella', h: 0.22, turn: 0.2 },
]

// Cámara desde la esquina abierta (+X, +Z), en tres cuartos sobre el escritorio y la cama. En celular, más atrás y
// con un acercamiento final más corto.
const CAMERA = {
  desktop: { pos: [2.6, 2.1, 3.6] as V3, look: [-0.15, 0.75, -0.45] as V3, fov: 40, zoom: 0.18 },
  mobile: { pos: [3.3, 2.6, 4.6] as V3, look: [-0.1, 0.7, -0.4] as V3, fov: 50, zoom: 0.1 },
}

// Material mate "gomita": arranca gris (el mismo color desaturado) y toma color cuando lo alcanza SU onda, con un borde luminoso.
type Ripple = { uCenters: { value: THREE.Vector3[] }; uRadii: { value: number[] } }
function rippleMaterial(color: string, wave: number, ripple: Ripple) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 })
  const own = { uWave: { value: wave } }
  m.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, ripple, own)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uCenters[3];\nuniform float uRadii[3];\nuniform int uWave;\nvarying vec3 vWPos;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float r = uRadii[uWave], d = distance(vWPos, uCenters[uWave]);
        float lit = 1.0 - smoothstep(r - 0.25, r, d);
        float ring = (1.0 - smoothstep(0.0, 0.1, abs(d - r))) * step(0.01, r) * (1.0 - smoothstep(${(MAX_RADIUS * 0.5).toFixed(1)}, ${MAX_RADIUS.toFixed(1)}, r));
        vec3 gray = vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114))) * 0.55 + 0.18;
        diffuseColor.rgb = mix(gray, diffuseColor.rgb, lit) + vec3(1.0, 0.92, 0.8) * ring * 0.3;`)
  }
  m.customProgramCacheKey = () => 'gemma-ripple'
  return m
}

function blobTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d')!, grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(70,35,25,.5)'); grad.addColorStop(0.6, 'rgba(70,35,25,.14)'); grad.addColorStop(1, 'rgba(70,35,25,0)')
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}

const dracoLoader = (loader: GLTFLoader) => {
  const draco = new DRACOLoader(); draco.setDecoderPath('/draco/'); loader.setDRACOLoader(draco)
}

function Room({ progress, reduced, narrow }: { progress: MutableRefObject<RoomProgress>; reduced: boolean; narrow: boolean }) {
  const gltf = useLoader(GLTFLoader, '/modelos/cuarto.glb', dracoLoader)
  const cam = narrow ? CAMERA.mobile : CAMERA.desktop
  // Cuarto con materiales propios por grupo y las posiciones de los puntos de apoyo.
  const { scene, apoyos, ripple } = useMemo(() => {
    const scene = gltf.scene.clone(true)
    scene.updateMatrixWorld(true)
    const apoyos = ITEMS.map(i => (scene.getObjectByName(i.apoyo)?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3()))
    const ripple: Ripple = { uCenters: { value: apoyos }, uRadii: { value: [0, 0, 0] } }
    const cache = new Map<string, THREE.Material>()
    for (const [group, def] of Object.entries(GROUPS)) {
      scene.getObjectByName(group)?.children.forEach(piece => {
        const color = def.colors.find(([name]) => piece.name.startsWith(name))?.[1] ?? def.fallback
        const key = `${color}-${def.wave}`
        if (!cache.has(key)) cache.set(key, rippleMaterial(color, def.wave, ripple))
        piece.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = cache.get(key)! })
      })
    }
    // Lo que quedó fuera de los 4 grupos (el glb trae un Window_Group suelto) va con las paredes, como la ventana.
    const own = new Set(cache.values())
    const leftover = rippleMaterial('#FFF6EC', GROUPS.Paredes.wave, ripple)
    scene.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh && !own.has(m.material as THREE.Material)) m.material = leftover })
    return { scene, apoyos, ripple }
  }, [gltf])
  const shadow = useMemo(() => blobTexture(), [])

  useFrame(() => {
    const q = reduced ? 1 : progress.current.rincon
    ITEMS.forEach((_, i) => { ripple.uRadii.value[i] = ease(clamp01((q - LANDINGS[i]) / WAVE)) * MAX_RADIUS })
  })

  return <>
    <primitive object={scene} />
    <Suspense fallback={null}>
      {ITEMS.map((item, i) => <FallingItem key={i} index={i} at={apoyos[i]} cam={cam.pos} progress={progress} reduced={reduced} shadow={shadow} />)}
    </Suspense>
  </>
}

function FallingItem({ index, at, cam, progress, reduced, shadow }: { index: number; at: THREE.Vector3; cam: V3; progress: MutableRefObject<RoomProgress>; reduced: boolean; shadow: THREE.Texture }) {
  const item = ITEMS[index], isStar = index === 2
  const gltf = useLoader(GLTFLoader, item.url, loader => loader.setMeshoptDecoder(MeshoptDecoder))
  const { scene, mats } = useMemo(() => {
    const s = gltf.scene.clone(true), mats: THREE.MeshStandardMaterial[] = []
    if (item.url.endsWith('gemi.glb')) s.add(buildFace(s))
    if (isStar) s.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { const mat = (m.material as THREE.MeshStandardMaterial).clone(); m.material = mat; mats.push(mat) } })
    return { scene: s, mats }
  }, [gltf, item.url, isStar])
  const body = useRef<THREE.Group>(null), blob = useRef<THREE.Mesh>(null), light = useRef<THREE.PointLight>(null)
  const k = item.h / (2 * item.half)
  const facing = Math.atan2(cam[0] - at.x, cam[2] - at.z) + item.turn // de frente a la cámara

  useFrame(() => {
    if (!body.current || !blob.current) return
    const q = reduced ? 1 : progress.current.rincon, land = LANDINGS[index]
    const fall = clamp01((q - (land - 0.1)) / 0.1), u = clamp01((q - land) / 0.08)
    // Cae acelerando desde arriba del encuadre; al tocar, dos rebotes cortos de gomita que se apagan.
    const drop = (1 - fall * fall) * 2.2 + Math.abs(Math.sin(2 * Math.PI * u)) * (1 - u) ** 2 * item.h * 0.18
    const squash = u > 0 && u < 1 ? 1 - 0.22 * Math.sin(3 * Math.PI * u) * (1 - u) : 1
    body.current.position.y = drop
    body.current.scale.set(k / Math.sqrt(squash), k * squash, k / Math.sqrt(squash))
    body.current.visible = fall > 0
    ;(blob.current.material as THREE.MeshBasicMaterial).opacity = 0.6 * clamp01(1 - drop / (item.h * 2))
    if (isStar) {
      // Brillo final: la estrella se enciende y su luz cálida ilumina todo el cuarto.
      const glow = ease(clamp01((q - GLOW[0]) / (GLOW[1] - GLOW[0])))
      mats.forEach(m => { m.emissive.set('#FFB347'); m.emissiveIntensity = glow * 0.9 })
      if (light.current) light.current.intensity = glow * 7
    }
  })

  return <group position={at}>
    <group ref={body}><group rotation={[0, facing, 0]}><primitive object={scene} position={[0, item.half, 0]} /></group></group>
    <mesh ref={blob} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} scale={[item.h * 1.3, item.h * 1.1, 1]}>
      <planeGeometry /><meshBasicMaterial map={shadow} transparent depthWrite={false} opacity={0} />
    </mesh>
    {isStar && <pointLight ref={light} position={[0, item.h * 0.8, 0.15]} color="#FFB347" intensity={0} distance={9} decay={1.6} />}
  </group>
}

// Cámara en tres cuartos; al final se acerca un poco. La niebla hace aparecer el cuarto al entrar y lo disuelve al salir.
function Rig({ progress, reduced, narrow }: { progress: MutableRefObject<RoomProgress>; reduced: boolean; narrow: boolean }) {
  const { camera, scene } = useThree()
  const cam = narrow ? CAMERA.mobile : CAMERA.desktop
  const v = useMemo(() => ({ pos: new THREE.Vector3(...cam.pos), look: new THREE.Vector3(...cam.look), p: new THREE.Vector3() }), [cam])
  const fog = useMemo(() => new THREE.Fog(FOG, 4, 13), [])
  scene.fog = fog
  useFrame(() => {
    const { rincon, enter, exit } = progress.current
    const zoom = reduced ? 0 : ease(clamp01((rincon - ZOOM[0]) / (ZOOM[1] - ZOOM[0]))) * cam.zoom
    camera.position.copy(v.p.copy(v.pos).lerp(v.look, zoom))
    camera.lookAt(v.look)
    const vis = reduced ? 1 : ease(clamp01(enter)) * (1 - ease(clamp01(exit)))
    fog.near = 4 * vis
    fog.far = 0.6 + 12.4 * vis
  })
  return null
}

export default function RoomScene({ progress, narrow, reduced }: { progress: MutableRefObject<RoomProgress>; narrow: boolean; reduced: boolean }) {
  const cam = narrow ? CAMERA.mobile : CAMERA.desktop
  return <Canvas
    frameloop="demand"
    dpr={narrow ? [1, 1.25] : [1, 1.75]}
    gl={{ antialias: !narrow, alpha: true, powerPreference: narrow ? 'low-power' : 'high-performance' }}
    camera={{ position: cam.pos, fov: cam.fov, near: 0.05, far: 30 }}
    aria-hidden="true"
  >
    <hemisphereLight args={['#fff4e6', '#e9c7b0', 1.5]} />
    <directionalLight position={[3, 4, 2.5]} intensity={1.3} />
    <Rig progress={progress} reduced={reduced} narrow={narrow} />
    <Suspense fallback={null}><Room progress={progress} reduced={reduced} narrow={narrow} /></Suspense>
  </Canvas>
}
