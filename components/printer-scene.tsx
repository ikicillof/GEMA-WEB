'use client'

import { Suspense, useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { DEFAULT_DOG_COLOR, PJ } from '@/lib/printer-timeline'

// Impresora 3D armada con código: formas redondeadas, acabado mate tipo gomita, cuerpo rosa pastel y detalles violeta.
// Todo es función del progreso p (0 → 1), así que al subir el scroll todo vuelve hacia atrás: la pieza se "desimprime"
// capa por capa y el hilo vuelve a la bobina. En esta escena el que baja es la CAMA (como en las impresoras de caja):
// la boquilla queda a una altura fija y el plano de corte (clipping) coincide siempre con la capa que se está imprimiendo.
const PINK = '#FFB4D8', VIOLET = '#6D28D9', GEMMA = '#FF4DA6', CREAM = '#FFF3E4', YELLOW = '#FFD93D'
const NOZZLE_Y = 1.85 // altura de la punta de la boquilla
const CUT_Y = NOZZLE_Y - 0.03 // la capa en construcción queda 3 cm bajo la punta
const DOG_S = 0.6 // el perro mide 2 × 1,73 × 0,64 unidades: acá queda de 1,2 de ancho
const DOG_HALF = 0.865 // mitad del alto del modelo
const DOG_H = DOG_HALF * 2 * DOG_S
const LAYERS = 30
const BAND = 0.045 // grosor del borde brillante de la capa activa

// color: hex elegido en el menú de la sección; el hilo, la capa brillante y la pieza lo siguen con una transición suave.
type Props = { progress: MutableRefObject<number>; color: MutableRefObject<string>; narrow: boolean; reduced: boolean; live: boolean }

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }
const tri = (x: number) => 1 - 4 * Math.abs(x - Math.floor(x) - 0.5) // onda triangular de −1 a 1

// Cámara: [p, posición, objetivo]. Entre dos claves va suave (sale y llega frenando).
const KEYS: [number, [number, number, number], [number, number, number]][] = [
  [0, [-4.4, 2.1, 2.9], [-1.9, 1.5, 0]], // cerca de la bobina, de costado: se ve el hilo enrollado entre las tapas
  [0.2, [-4.1, 2.0, 3.3], [-1.9, 1.5, 0]],
  [0.44, [0.9, 2.1, 7.0], [-0.3, 1.2, 0]], // se ve la impresora completa
  [0.78, [0.6, 2.6, 5.2], [0, 1.1, 0]], // desde arriba, para ver la capa que se imprime
  [1, [0.3, 1.8, 5.9], [0, 1.2, 0.7]], // la pieza terminada
]

function glow(rgb: string) {
  const c = document.createElement('canvas'); c.width = c.height = 64
  const g = c.getContext('2d')!, grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, `rgba(${rgb},1)`); grad.addColorStop(0.35, `rgba(${rgb},.35)`); grad.addColorStop(1, `rgba(${rgb},0)`)
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}
function blobTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d')!, grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(70,30,60,.5)'); grad.addColorStop(0.6, 'rgba(70,30,60,.16)'); grad.addColorStop(1, 'rgba(70,30,60,0)')
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}

function Printer({ progress, color, narrow, reduced }: Props) {
  const { camera, size } = useThree()
  const gltf = useLoader(GLTFLoader, '/modelos/perro-globo.glb', loader => loader.setMeshoptDecoder(MeshoptDecoder))
  const refs = {
    printer: useRef<THREE.Group>(null), spool: useRef<THREE.Group>(null), xrail: useRef<THREE.Group>(null), carriage: useRef<THREE.Group>(null),
    bed: useRef<THREE.Group>(null), part: useRef<THREE.Group>(null), fil: useRef<THREE.InstancedMesh>(null), cap: useRef<THREE.Mesh>(null),
    back: useRef<THREE.Mesh>(null), front: useRef<THREE.Mesh>(null), band: useRef<THREE.Mesh>(null), heatSprite: useRef<THREE.Sprite>(null),
    heatLight: useRef<THREE.PointLight>(null), blobPrinter: useRef<THREE.Mesh>(null), blobPart: useRef<THREE.Mesh>(null),
  }
  const N = narrow ? 30 : 52 // segmentos del hilo

  const kit = useMemo(() => {
    const std = (color: string, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 })
    const pink = std(PINK), violet = std(VIOLET, 0.8), cream = std(CREAM), filament = std(GEMMA, 0.6), yellow = std(YELLOW, 0.7)
    // Un poco de brillo propio (mate, no metálico) para que los colores del brand no se apaguen en las caras en sombra.
    violet.emissive.set(VIOLET).multiplyScalar(0.28); filament.emissive.set(GEMMA).multiplyScalar(0.32); pink.emissive.set(PINK).multiplyScalar(0.18)
    const hot = new THREE.MeshStandardMaterial({ color: '#F4A15D', roughness: 0.55, metalness: 0.1, emissive: new THREE.Color('#FF7A1A'), emissiveIntensity: 0 })
    const top = new THREE.Plane(new THREE.Vector3(0, -1, 0), CUT_Y) // conserva lo que está por debajo de la capa activa
    const bottom = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(CUT_Y - BAND)) // y, para el borde brillante, solo la franja de arriba
    // La pieza: rosa Gemma mate con finas líneas horizontales cada capa (fijas al objeto, se pintan en el shader).
    // Sin iluminación: las normales del modelo dejan manchas, así que (como en el resto del sitio) el volumen se da con un
    // degradado suave por posición, y encima las líneas de cada capa.
    const dog = new THREE.MeshBasicMaterial({ color: GEMMA, clippingPlanes: [top] })
    dog.onBeforeCompile = shader => {
      shader.uniforms.uLayer = { value: (DOG_HALF * 2) / LAYERS }
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvP = position.xy;')
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vP; uniform float uLayer;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec2 t = clamp((vP - vec2(-1.0, -${DOG_HALF})) / vec2(2.0, ${(DOG_HALF * 2).toFixed(3)}), 0.0, 1.0);
          diffuseColor.rgb *= 0.66 + 0.3 * smoothstep(0.0, 1.0, t.y) + 0.1 * (0.5 - t.x);
          float lf = abs(fract(vP.y / uLayer) - 0.5); diffuseColor.rgb *= 1.0 - 0.2 * smoothstep(0.36, 0.5, lf);`)
    }
    const band = new THREE.MeshBasicMaterial({ color: '#FFE3F1', clippingPlanes: [top, bottom], polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, toneMapped: false })
    // Tapa de la sección (stencil): rellena el corte con color sólido para que la pieza se vea maciza mientras se construye.
    const stencil = { depthWrite: false, depthTest: false, colorWrite: false, stencilWrite: true, stencilFunc: THREE.AlwaysStencilFunc, clippingPlanes: [top] }
    const back = new THREE.MeshBasicMaterial({ ...stencil, side: THREE.BackSide, stencilFail: THREE.IncrementWrapStencilOp, stencilZFail: THREE.IncrementWrapStencilOp, stencilZPass: THREE.IncrementWrapStencilOp })
    const front = new THREE.MeshBasicMaterial({ ...stencil, side: THREE.FrontSide, stencilFail: THREE.DecrementWrapStencilOp, stencilZFail: THREE.DecrementWrapStencilOp, stencilZPass: THREE.DecrementWrapStencilOp })
    const cap = new THREE.MeshStandardMaterial({ color: '#FF8FC8', emissive: new THREE.Color(GEMMA), emissiveIntensity: 0.85, roughness: 0.6, side: THREE.DoubleSide, stencilWrite: true, stencilRef: 0, stencilFunc: THREE.NotEqualStencilFunc, stencilFail: THREE.ReplaceStencilOp, stencilZFail: THREE.ReplaceStencilOp, stencilZPass: THREE.ReplaceStencilOp })
    let geo: THREE.BufferGeometry | null = null
    gltf.scene.traverse(o => { const m = o as THREE.Mesh; if (!geo && m.isMesh) geo = m.geometry })
    const seg = narrow ? 1 : 3
    const rb = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001))
    const g = {
      base: rb(2.5, 0.3, 2.1, 0.09), plate: rb(0.95, 0.12, 0.05, 0.03), post: rb(0.14, 2.05, 0.14, 0.05), rail: rb(0.12, 0.12, 2.0, 0.04), xr: rb(2.2, 0.12, 0.14, 0.04),
      car: rb(0.34, 0.22, 0.3, 0.07), fan: rb(0.22, 0.16, 0.05, 0.04), hotend: rb(0.15, 0.18, 0.15, 0.05), slab: rb(1.7, 0.12, 1.7, 0.05), glass: rb(1.56, 0.04, 1.56, 0.02),
      arm: rb(0.3, 0.1, 0.3, 0.04), holder: rb(0.9, 0.14, 0.14, 0.05),
    }
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-1.65, 2.17, 0), new THREE.Vector3(-1.2, 2.75, 0), new THREE.Vector3(-0.6, 2.8, 0), new THREE.Vector3(0, 2.3, 0)])
    return {
      fade: [pink, violet, cream, filament, yellow, hot] as THREE.MeshStandardMaterial[], pink, violet, cream, filament, yellow, hot, dog, band, back, front, cap, top, bottom,
      geo: geo as THREE.BufferGeometry | null, g, curve, heatTex: glow('255,150,60'), blobTex: blobTexture(), faded: false,
      cur: new THREE.Color(color.current || DEFAULT_DOG_COLOR), tgt: new THREE.Color(), white: new THREE.Color('#ffffff'),
    }
  }, [gltf, narrow, color])

  const tmp = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), obj: new THREE.Object3D(), dir: new THREE.Vector3(), right: new THREE.Vector3(), pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fw: new THREE.Vector3(), off: new THREE.Vector3() }), [])

  useFrame(({ clock }, delta) => {
    const r = refs
    if (!r.part.current || !r.bed.current || !r.printer.current) return
    const p = reduced ? PJ.PRINT[1] : progress.current
    const t = clock.elapsedTime
    // --- color elegido: el hilo (bobina y filamento), la capa brillante, la tapa del corte y la pieza lo siguen suavemente
    kit.tgt.set(color.current || DEFAULT_DOG_COLOR)
    kit.cur.lerp(kit.tgt, reduced ? 1 : 1 - Math.exp(-delta * 7))
    kit.filament.color.copy(kit.cur); kit.filament.emissive.copy(kit.cur).multiplyScalar(0.32)
    kit.dog.color.copy(kit.cur)
    kit.band.color.copy(kit.cur).lerp(kit.white, 0.62)
    kit.cap.color.copy(kit.cur).lerp(kit.white, 0.25); kit.cap.emissive.copy(kit.cur)
    // --- tiempos de cada etapa
    const L = clamp01((p - PJ.PRINT[0]) / (PJ.PRINT[1] - PJ.PRINT[0])) // capa 0 → 1
    const u4 = clamp01((p - PJ.DONE[0]) / (PJ.DONE[1] - PJ.DONE[0])) // 0 → 1 tras imprimir
    const fil = reduced ? 1 : smooth(PJ.FILAMENT[0], PJ.FILAMENT[1], p)
    const heat = reduced ? 0 : smooth(PJ.HEAT[0], PJ.HEAT[1], p) * (1 - smooth(0.04, 0.2, u4))
    const printing = L > 0.002 && L < 1 && !reduced

    // --- bobina: gira despacio siempre y más cuanto más hilo se usa
    if (r.spool.current) r.spool.current.rotation.z = -(t * 0.3 + p * 12)

    // --- boquilla: reposo al centro; imprimiendo, recorre la pieza de lado a lado
    const move = printing ? smooth(0, 0.03, L) * (1 - smooth(0.97, 1, L)) : 0
    const nx = 0.5 * tri(L * 20) * move, nz = 0.16 * tri(L * 3.3 + 0.25) * move
    if (r.xrail.current) r.xrail.current.position.z = nz
    if (r.carriage.current) r.carriage.current.position.x = nx

    // --- cama y pieza (la cama baja una capa por vez; el corte queda siempre 3 cm bajo la punta)
    const restY = CUT_Y - DOG_H
    const bedTop = reduced ? restY : CUT_Y - DOG_H * L
    r.bed.current.position.y = bedTop
    const part = r.part.current
    const released = u4 > 0 || reduced
    kit.top.constant = released ? 99 : CUT_Y
    const showPart = reduced || p >= PJ.PRINT[0] + 0.001
    part.visible = showPart
    if (r.band.current) r.band.current.visible = !released && printing
    if (r.back.current) r.back.current.visible = !released && showPart
    if (r.front.current) r.front.current.visible = !released && showPart
    if (r.cap.current) { r.cap.current.visible = !released && showPart; r.cap.current.position.set(0, CUT_Y, 0) }
    // Pieza terminada: se despega de la cama, da un saltito y queda girando en el centro.
    let py = bedTop, pz = 0, ps = 1, ry = reduced ? 0.15 : 0
    if (!reduced && u4 > 0) {
      const peel = smooth(0, 0.18, u4), go = smooth(0.18, 0.62, u4)
      py = restY + 0.05 * peel + (0.55 - restY) * go + Math.sin(Math.PI * go) * 0.5 + Math.sin(t * 1.6) * 0.03 * smooth(0.62, 0.8, u4)
      pz = 0.7 * go; ps = 1 + 0.22 * go; ry = t * 0.7 + u4 * 7
    }
    part.position.set(0, py, pz); part.scale.setScalar(ps); part.rotation.y = ry
    // --- impresora: se desvanece mientras la pieza se va al centro
    const fade = reduced ? 1 : 1 - smooth(0.1, 0.55, u4)
    r.printer.current.visible = fade > 0.01
    const needsTransparent = fade < 0.999
    if (needsTransparent !== kit.faded) { kit.faded = needsTransparent; kit.fade.forEach(m => { m.transparent = needsTransparent; m.needsUpdate = true }) }
    if (needsTransparent) kit.fade.forEach(m => { m.opacity = fade })

    // --- boquilla caliente: brillo naranja
    kit.hot.emissiveIntensity = heat * 2.2
    if (r.heatSprite.current) { r.heatSprite.current.material.opacity = heat * 0.95 * fade; r.heatSprite.current.scale.setScalar(0.12 + heat * 0.42) }
    if (r.heatLight.current) r.heatLight.current.intensity = heat * 2.4 * fade

    // --- filamento: va de la bobina a la boquilla por una curva y se revela con el hilo que se desenrolla
    const c = kit.curve
    c.points[2].set(nx - 0.6, 2.8, nz * 0.6); c.points[3].set(nx, 2.3, nz)
    const fm = r.fil.current
    if (fm) {
      const shown = Math.round(fil * N)
      for (let i = 0; i < shown; i++) {
        c.getPoint(i / N, tmp.a); c.getPoint((i + 1) / N, tmp.b)
        tmp.dir.subVectors(tmp.b, tmp.a); const len = tmp.dir.length() * 1.35
        tmp.obj.position.addVectors(tmp.a, tmp.b).multiplyScalar(0.5)
        tmp.obj.quaternion.setFromUnitVectors(tmp.up, tmp.dir.normalize()); tmp.obj.scale.set(1, len, 1); tmp.obj.updateMatrix()
        fm.setMatrixAt(i, tmp.obj.matrix)
      }
      fm.count = shown; fm.instanceMatrix.needsUpdate = true; fm.visible = fade > 0.01 && shown > 0
    }

    // --- sombras de contacto
    if (r.blobPrinter.current) (r.blobPrinter.current.material as THREE.MeshBasicMaterial).opacity = fade
    if (r.blobPart.current) {
      const h = Math.max(0, py - restY), a = smooth(0.15, 0.4, u4)
      r.blobPart.current.visible = a > 0.01 && !reduced
      r.blobPart.current.position.set(0, 0.015, pz); r.blobPart.current.scale.setScalar((1.15 - h * 0.35) * ps)
      ;(r.blobPart.current.material as THREE.MeshBasicMaterial).opacity = a * 0.7
    }

    // --- cámara: claves por tramo, con el sujeto corrido hacia un costado (el texto va del lado opuesto)
    const pc = reduced ? 0.78 : p
    let i = 0
    while (i < KEYS.length - 2 && pc > KEYS[i + 1][0]) i++
    const A = KEYS[i], B = KEYS[i + 1], f = smooth(A[0], B[0], pc)
    tmp.pos.set(...A[1]).lerp(tmp.a.set(...B[1]), f); tmp.tgt.set(...A[2]).lerp(tmp.b.set(...B[2]), f)
    const cam = camera as THREE.PerspectiveCamera
    const aspect = size.width / size.height
    if (aspect < 1.05) { tmp.fw.subVectors(tmp.pos, tmp.tgt).multiplyScalar(Math.min(2.3, (0.62 * 1.6) / aspect) - 1); tmp.pos.add(tmp.fw) } // pantallas angostas: más lejos
    tmp.fw.subVectors(tmp.tgt, tmp.pos); const dist = tmp.fw.length(); tmp.fw.normalize()
    tmp.right.crossVectors(tmp.fw, tmp.up).normalize()
    const visH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), visW = visH * aspect
    const leave = reduced ? 0 : smooth(0.55, 1, u4)
    const shiftX = aspect >= 1.05 ? 0.17 * (1 - leave * 0.6) * visW : 0 // sujeto hacia la derecha en escritorio…
    const shiftY = aspect >= 1.05 ? 0 : 0.14 * visH // …y hacia abajo en celular (el texto va arriba)
    tmp.off.copy(tmp.right).multiplyScalar(-shiftX).addScaledVector(tmp.up, shiftY)
    cam.position.copy(tmp.pos).add(tmp.off); cam.lookAt(tmp.tgt.add(tmp.off))
  })

  const { g } = kit
  const P = kit.pink, V = kit.violet
  const holes = [0, 1, 2, 3, 4].map(i => (i / 5) * Math.PI * 2)
  return <>
    <group ref={refs.printer}>
      {/* base con frente violeta y botón amarillo */}
      <mesh geometry={g.base} material={P} position={[0, 0.15, 0]} />
      <mesh geometry={g.plate} material={V} position={[0.55, 0.15, 1.06]} />
      <mesh material={kit.yellow} position={[-0.25, 0.15, 1.07]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.055, 0.055, 0.04, 16]} /></mesh>
      {/* cuatro postes y rieles superiores (fijos, a lo largo de Z) */}
      {[[-1.1, -0.9], [1.1, -0.9], [-1.1, 0.9], [1.1, 0.9]].map(([x, z], i) => <mesh key={i} geometry={g.post} material={P} position={[x, 1.325, z]} />)}
      {[-1.1, 1.1].map(x => <mesh key={x} geometry={g.rail} material={V} position={[x, 2.36, 0]} />)}
      {/* riel X (se mueve en Z) con el carro (se mueve en X), el hotend y la boquilla */}
      <group ref={refs.xrail}>
        <mesh geometry={g.xr} material={P} position={[0, 2.3, 0]} />
        <group ref={refs.carriage}>
          <mesh geometry={g.car} material={V} position={[0, 2.17, 0]} />
          <mesh geometry={g.fan} material={P} position={[0, 2.15, 0.17]} />
          <mesh geometry={g.hotend} material={P} position={[0, 2.0, 0]} />
          <mesh material={kit.hot} position={[0, 1.9, 0]}><cylinderGeometry args={[0.075, 0.02, 0.1, 18]} /></mesh>
          <sprite ref={refs.heatSprite} position={[0, 1.86, 0]} scale={0.12}><spriteMaterial map={kit.heatTex} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>
          <pointLight ref={refs.heatLight} position={[0, 1.8, 0.1]} color="#FF8A3D" intensity={0} distance={1.8} decay={1.6} />
        </group>
      </group>
      {/* columna Z y cama (baja a medida que se imprime) */}
      <mesh material={V} position={[0, 1.22, -0.98]}><cylinderGeometry args={[0.05, 0.05, 1.9, 14]} /></mesh>
      <group ref={refs.bed}>
        <mesh geometry={g.slab} material={V} position={[0, -0.1, 0]} />
        <mesh geometry={g.glass} material={kit.cream} position={[0, -0.02, 0]} />
        <mesh geometry={g.arm} material={V} position={[0, -0.1, -0.95]} />
      </group>
      {/* bobina de filamento rosa Gemma, a un costado */}
      <mesh geometry={g.holder} material={P} position={[-1.45, 1.55, 0]} />
      <mesh material={P} position={[-1.85, 1.55, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.06, 0.06, 1.0, 12]} /></mesh>
      <group ref={refs.spool} position={[-1.85, 1.55, 0]}>
        <mesh material={kit.filament} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.66, 0.66, 0.46, narrow ? 28 : 48]} /></mesh>
        {[-0.28, 0.28].map(z => <mesh key={z} material={V} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.82, 0.82, 0.07, narrow ? 28 : 48]} /></mesh>)}
        <mesh material={P} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.16, 0.16, 0.66, 18]} /></mesh>
        {!narrow && [-0.325, 0.325].map(z => holes.map((a, i) => <mesh key={`${z}${i}`} material={kit.cream} position={[Math.cos(a) * 0.5, Math.sin(a) * 0.5, z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.1, 0.1, 0.02, 14]} /></mesh>))}
        <mesh material={kit.yellow} position={[0.78, 0, 0.3]}><boxGeometry args={[0.12, 0.1, 0.06]} /></mesh>
      </group>
      {/* el hilo que va de la bobina a la boquilla */}
      <instancedMesh ref={refs.fil} args={[undefined, undefined, N]} material={kit.filament} frustumCulled={false}><cylinderGeometry args={[0.028, 0.028, 1, 6]} /></instancedMesh>
    </group>
    {/* sombras de contacto */}
    <mesh ref={refs.blobPrinter} rotation={[-Math.PI / 2, 0, 0]} position={[-0.3, 0.012, 0]} scale={[5.6, 3.1, 1]}><planeGeometry /><meshBasicMaterial map={kit.blobTex} transparent depthWrite={false} /></mesh>
    <mesh ref={refs.blobPart} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.6, 0.9]} /><meshBasicMaterial map={kit.blobTex} transparent depthWrite={false} /></mesh>
    {/* la pieza: tapa de la sección (stencil) + pieza con líneas de capa + borde brillante de la capa activa */}
    {kit.geo && <group ref={refs.part}>
      <group scale={DOG_S}><group position={[0, DOG_HALF, 0]}>
        <mesh ref={refs.back} geometry={kit.geo} material={kit.back} renderOrder={1} />
        <mesh ref={refs.front} geometry={kit.geo} material={kit.front} renderOrder={2} />
        <mesh geometry={kit.geo} material={kit.dog} renderOrder={4} />
        <mesh ref={refs.band} geometry={kit.geo} material={kit.band} renderOrder={5} />
      </group></group>
    </group>}
    {kit.geo && <mesh ref={refs.cap} rotation={[-Math.PI / 2, 0, 0]} material={kit.cap} renderOrder={3} onAfterRender={(renderer: THREE.WebGLRenderer) => renderer.clearStencil()}><planeGeometry args={[2.6, 2.6]} /></mesh>}
  </>
}

export default function PrinterScene(props: Props) {
  return <Canvas
    frameloop={props.live && !props.reduced ? 'always' : 'demand'} // el color también se anima solo mientras la sección está en pantalla
    dpr={props.narrow ? [1, 1.25] : [1, 1.75]}
    gl={{ antialias: !props.narrow, alpha: true, stencil: true, powerPreference: props.narrow ? 'low-power' : 'high-performance' }}
    camera={{ fov: 35, near: 0.1, far: 80, position: [0, 2, 8] }}
    onCreated={({ gl }) => { gl.localClippingEnabled = true }}
    aria-hidden="true"
  >
    <hemisphereLight args={['#fff4e6', '#e7bad2', 1.45]} />
    <directionalLight position={[3, 5, 4]} intensity={1.5} />
    <Suspense fallback={null}><Printer {...props} /></Suspense>
  </Canvas>
}
