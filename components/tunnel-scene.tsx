'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ATLAS_COLUMNS, ATLAS_ROWS } from '@/lib/tunnel-assets'

// Tubo circular de radio 1 (la cámara va por el eje). Todo el movimiento sale de UN solo valor de tiempo t (0 → 1): de t se calcula
// en JS la posición de la cámara y la velocidad (dos escalares por cuadro) y los shaders hacen el resto (grilla de anillos y líneas
// longitudinales, reciclado de discos, brillo por cercanía y velocidad, estela, luz de salida). No se recorren discos en JS.
const EXIT = 40 // profundidad de la salida (círculo de luz)
const LOOP = 48 // largo del tramo de discos reciclables
const CELL = 0.5 // anillos de la grilla cada 0,5 a lo largo del tubo
const LANES = 16 // casilleros alrededor del tubo (22,5° cada uno)
const ARC = (Math.PI * 2) / LANES
const CELLS = LOOP / CELL
const DISC = 0.34 // diámetro de cada disco
const THICK = 0.1 // grosor (leve volumen, tipo botón de gomita)

const PALETTE = ['#FF4DA6', '#6D28D9', '#00E6D2', '#FFD93D', '#EF4444', '#D946EF', '#2563EB', '#38BDF8', '#22C55E', '#F97316']
const hex = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255] }
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

type Uniforms = {
  uCamZ: { value: number }; uSpeed: { value: number }; uBlur: { value: number }; uExitScale: { value: number }
  uGlow: { value: number }; uRes: { value: THREE.Vector2 }; uAtlas: { value: THREE.Texture | null }
  uExitColor: { value: THREE.Vector3 }; uWarm: { value: number }
}
// Pared: la grilla rosa pastel se dibuja en el shader como anillos alrededor del tubo y líneas que corren a lo largo.
const WALLS_VERT = /* glsl */`
  varying vec3 vW;
  void main() { vW = position; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`
const WALLS_FRAG = /* glsl */`
  uniform float uCamZ, uSpeed, uBlur, uGlow, uWarm; uniform vec2 uRes;
  varying vec3 vW;
  float lines(float c, float cell, float w) { float x = abs(fract(c / cell + 0.5) - 0.5) * cell; return 1.0 - smoothstep(0.0, w, x); }
  void main() {
    if (vW.z < -${EXIT.toFixed(1)}) discard;
    float dist = uCamZ - vW.z;
    // Desenfoque de movimiento en los bordes (solo escritorio: uBlur = 0 en celular): se promedian 5 muestras a lo largo de z.
    float edge = length((gl_FragCoord.xy / uRes - 0.5) * 2.0);
    float blur = uBlur * uSpeed * smoothstep(0.35, 1.2, edge) * 0.9;
    float w = 0.011, acc = 0.0;
    for (int i = 0; i < 5; i++) {
      float z = vW.z + (float(i) - 2.0) * blur;
      acc += max(lines(z, ${CELL.toFixed(2)}, w), lines(z, 2.0, w * 1.6));
    }
    float ang = atan(vW.y, vW.x);  // el ARC divide 2π en partes enteras: no hay costura en ±π
    float l = max(acc / 5.0, max(lines(ang, ${ARC.toFixed(5)}, w), lines(ang, ${(ARC * 4).toFixed(5)}, w * 1.6)));
    float a = l * 0.3 * (1.0 + uSpeed * 0.9) * (1.0 - smoothstep(16.0, 46.0, dist) * 0.88);
    vec3 col = mix(vec3(0.059, 0.059, 0.063), vec3(1.0, 0.706, 0.847), a);
    // La luz de la salida se derrama sobre las paredes cercanas (más tenue si la página de destino es oscura).
    float toExit = vW.z + ${EXIT.toFixed(1)};
    col += vec3(1.0, 0.78, 0.5) * smoothstep(16.0, 0.0, toExit) * 0.42 * uGlow * mix(0.3, 1.0, uWarm);
    gl_FragColor = vec4(col, 1.0);
  }`

// Discos: una sola InstancedMesh reciclada. aInst: x = casillero alrededor del tubo, z = profundidad base, w = foto (−1 = color).
// Cada disco se apoya en la pared curva y mira hacia el centro del tubo.
const BLOCK_VERT = /* glsl */`
  attribute vec4 aInst;
  attribute vec3 aColor;
  uniform float uCamZ, uSpeed, uBlur;
  varying vec3 vN; varying vec3 vCol; varying float vTile; varying vec3 vLocal; varying vec3 vLN; varying float vDist; varying vec3 vL;
  void main() {
    // Reciclado: el disco da la vuelta cuando la cámara lo pasa (siempre hay LOOP de discos por delante).
    float travelled = -uCamZ;
    float d = mod(aInst.z - travelled, ${LOOP.toFixed(1)}) + 0.5;
    float wz = uCamZ - d;
    float phi = (aInst.x + 0.5) * ${ARC.toFixed(5)};
    vec3 inward = vec3(-cos(phi), -sin(phi), 0.0);
    vec3 tang = vec3(-sin(phi), cos(phi), 0.0);
    vec3 axis = vec3(0.0, 0.0, 1.0);
    vec3 lp = position * vec3(${DISC.toFixed(2)}, ${THICK.toFixed(2)}, ${DISC.toFixed(2)} * (1.0 + 2.4 * uBlur * uSpeed));   // y = hacia adentro del tubo
    vec3 centre = vec3(cos(phi), sin(phi), wz) + inward * ${(THICK / 2).toFixed(3)};
    vec3 w = centre + tang * lp.x + inward * lp.y + axis * lp.z;
    vN = tang * normal.x + inward * normal.y + axis * normal.z;
    vL = normalize(axis * 0.8 + inward * 0.6);   // luz desde la cámara y un poco desde adentro: parejo alrededor de todo el tubo
    vCol = aColor; vTile = aInst.w; vLocal = vec3(position.x, 0.0, position.z) + 0.5; vLN = normal; vDist = d;
    if (wz < -${EXIT.toFixed(1)} + 0.4) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }   // pasada la salida no se dibuja
    gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  }`
const BLOCK_FRAG = /* glsl */`
  uniform float uSpeed, uGlow, uWarm; uniform sampler2D uAtlas;
  varying vec3 vN; varying vec3 vCol; varying float vTile; varying vec3 vLocal; varying vec3 vLN; varying float vDist; varying vec3 vL;
  void main() {
    vec3 col = vCol;
    if (vTile > -0.5 && vLN.y > 0.5) {   // cara que mira hacia adentro: foto del producto, recortada en círculo (es la tapa del disco)
      vec2 q = clamp((vLocal.xz - 0.5) / 0.8 + 0.5, 0.0, 1.0);
      float t = floor(vTile + 0.5), cx = mod(t, ${ATLAS_COLUMNS}.0), cy = floor(t / ${ATLAS_COLUMNS}.0);
      vec2 uv = vec2((cx + q.x) / ${ATLAS_COLUMNS}.0, 1.0 - (cy + 1.0 - q.y) / ${ATLAS_ROWS}.0);
      col = texture2D(uAtlas, uv).rgb;
    }
    float diff = 0.5 + 0.5 * dot(normalize(vN), vL);
    col *= 0.62 + 0.5 * diff;   // mate, tipo gomita: el borde redondeado toma más luz y marca el volumen
    // Los discos que se acercan brillan más (y más rápido cuanto mayor es la velocidad).
    col *= 1.0 + 1.35 * smoothstep(15.0, 2.5, vDist) * (0.55 + 0.8 * uSpeed);
    col = mix(col, vec3(0.059, 0.059, 0.063), smoothstep(26.0, 46.0, vDist));
    col += vec3(1.0, 0.78, 0.5) * 0.12 * uGlow * mix(0.3, 1.0, uWarm);
    gl_FragColor = vec4(col, 1.0);
  }`

// Salida: un círculo de luz que crece hasta llenar la pantalla. Termina en el color de fondo de la página de destino (uExitColor).
const EXIT_VERT = /* glsl */`
  varying vec2 vUv; uniform float uExitScale;
  void main() { vUv = position.xy; vec3 p = vec3(position.xy * (1.0 + uExitScale), position.z - ${EXIT.toFixed(1)}); gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`
const EXIT_FRAG = /* glsl */`
  varying vec2 vUv; uniform float uExitScale; uniform vec3 uExitColor; uniform float uWarm;
  void main() {
    float d = length(vUv);
    float soft = 0.12 + uExitScale * 0.25;
    float mask = 1.0 - smoothstep(1.0 - soft, 1.0, d);
    vec3 edge = mix(uExitColor, vec3(1.0, 0.847, 0.659), 0.9 * uWarm);   // borde cálido en páginas claras; liso en las oscuras
    vec3 col = mix(edge, uExitColor, smoothstep(1.0, 0.0, d));
    gl_FragColor = vec4(col, mask);
  }`

function buildWalls() {
  // Tubo abierto: cilindro de radio 1 con el eje en z, visto desde adentro.
  const zNear = 4, zFar = -(EXIT + 2)
  return new THREE.CylinderGeometry(1, 1, zNear - zFar, 64, 1, true).rotateX(Math.PI / 2).translate(0, 0, (zNear + zFar) / 2)
}
// Disco "botón de gomita": perfil de revolución con la tapa plana (donde va la foto) y el borde redondeado. Va de abajo hacia arriba
// para que las normales salgan hacia afuera.
function buildDisc() {
  const prof: THREE.Vector2[] = [new THREE.Vector2(0.0001, -0.5), new THREE.Vector2(0.38, -0.5)]
  for (let i = 0; i <= 10; i++) { const t = Math.PI * (1 - i / 10); prof.push(new THREE.Vector2(0.38 + 0.12 * Math.sin(t), 0.5 * Math.cos(t))) }
  prof.push(new THREE.Vector2(0.0001, 0.5))
  return new THREE.LatheGeometry(prof, 28)
}

// Discos al azar: no en todos los casilleros, sin repetir lugar; ≈ 28 % con foto (si hay fotos).
function buildInstances(count: number, tiles: number) {
  const used = new Set<number>(), inst = new Float32Array(count * 4), col = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    let lane = 0, z = 0, key = 0
    do { lane = (Math.random() * LANES) | 0; z = (Math.random() * CELLS) | 0; key = lane * CELLS + z } while (used.has(key))
    used.add(key)
    inst.set([lane, 0, (z + 0.5) * CELL, tiles > 0 && Math.random() < 0.28 ? (Math.random() * tiles) | 0 : -1], i * 4)
    col.set(hex(PALETTE[(Math.random() * PALETTE.length) | 0]), i * 3)
  }
  return { inst, col }
}

export type ExitTint = { rgb: [number, number, number]; warm: number } // color de fondo de la página de destino (0..1) y si es clara (1) u oscura (0)
type Props = { atlas: HTMLCanvasElement | null; tiles: number; narrow: boolean; quick: boolean; duration: number; exit: MutableRefObject<ExitTint>; onEnd: () => void }

function Tunnel({ atlas, tiles, narrow, quick, duration, exit, onEnd }: Props) {
  const { camera, size, gl } = useThree()
  const mesh = useRef<THREE.InstancedMesh>(null)
  const state = useRef({ frame: 0, start: -1, ended: false, sample: 0, samples: 0 })
  const texture = useMemo(() => {
    const c = atlas ?? Object.assign(document.createElement('canvas'), { width: 1, height: 1 }) // versión rápida: sin fotos, atlas de relleno
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = true; return t
  }, [atlas])
  const uniforms = useMemo<Uniforms>(() => ({
    uCamZ: { value: 0 }, uSpeed: { value: 0 }, uBlur: { value: narrow ? 0 : 1 }, uExitScale: { value: 0 }, uGlow: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) }, uAtlas: { value: texture }, uExitColor: { value: new THREE.Vector3(1, 0.976, 0.961) }, uWarm: { value: 1 },
  }), [narrow, texture])
  // Versión rápida: menos discos y sin fotos. Completa: 150 (70 en celular, que igual usa siempre la rápida).
  const blocks = quick ? (narrow ? 36 : 60) : narrow ? 70 : 150
  const walls = useMemo(buildWalls, [])
  const { geometry, material, wallMat, exitMat, exitGeo } = useMemo(() => {
    const geometry = buildDisc()
    const { inst, col } = buildInstances(blocks, quick ? 0 : tiles)
    geometry.setAttribute('aInst', new THREE.InstancedBufferAttribute(inst, 4))
    geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(col, 3))
    const u = uniforms as unknown as Record<string, THREE.IUniform>
    return {
      geometry,
      material: new THREE.ShaderMaterial({ vertexShader: BLOCK_VERT, fragmentShader: BLOCK_FRAG, uniforms: u, toneMapped: false }),
      wallMat: new THREE.ShaderMaterial({ vertexShader: WALLS_VERT, fragmentShader: WALLS_FRAG, uniforms: u, side: THREE.DoubleSide, toneMapped: false }),
      exitMat: new THREE.ShaderMaterial({ vertexShader: EXIT_VERT, fragmentShader: EXIT_FRAG, uniforms: u, transparent: true, depthWrite: false, toneMapped: false }),
      exitGeo: new THREE.PlaneGeometry(2, 2),
    }
  }, [blocks, tiles, quick, uniforms])

  useEffect(() => { gl.outputColorSpace = THREE.LinearSRGBColorSpace; gl.setClearColor('#0F0F10', 1) }, [gl])
  // Libera la memoria de la GPU al terminar (el canvas se desmonta justo después).
  useEffect(() => () => { geometry.dispose(); material.dispose(); wallMat.dispose(); exitMat.dispose(); exitGeo.dispose(); walls.dispose(); texture.dispose() }, [geometry, material, wallMat, exitMat, exitGeo, walls, texture])

  useFrame((s, dt) => {
    const st = state.current
    st.frame++
    uniforms.uRes.value.set(size.width * gl.getPixelRatio(), size.height * gl.getPixelRatio())
    uniforms.uExitColor.value.set(...exit.current.rgb); uniforms.uWarm.value = exit.current.warm
    if (st.frame < 3) return                       // los primeros cuadros compilan los shaders: el reloj arranca después
    if (st.start < 0) st.start = s.clock.elapsedTime
    const t = clamp01((s.clock.elapsedTime - st.start) / duration)
    // UN solo valor de tiempo: t → posición de la cámara (lenta al arrancar, máxima a mitad de camino, frena en la salida).
    const e = t * t * (3 - 2 * t)
    camera.position.set(0, 0, -(EXIT - 0.9) * e)
    uniforms.uCamZ.value = camera.position.z
    uniforms.uSpeed.value = Math.min(1, 6 * t * (1 - t) / 1.5)
    uniforms.uGlow.value = clamp01((t - 0.35) / 0.5)
    const grow = clamp01((t - 0.8) / 0.2)
    uniforms.uExitScale.value = 3 * grow * grow * (3 - 2 * grow)
    // Si el dispositivo no llega a ≈ 48 cuadros por segundo, se reduce la cantidad de discos automáticamente.
    if (mesh.current && st.samples < 24 && st.frame > 6) { st.sample += dt; st.samples++; if (st.samples === 24 && st.sample / 24 > 1 / 48) mesh.current.count = Math.floor(blocks * 0.55) }
    if (t >= 1 && !st.ended) { st.ended = true; onEnd() }
  })

  return <>
    <mesh geometry={walls} material={wallMat} frustumCulled={false} />
    <instancedMesh ref={mesh} args={[geometry, material, blocks]} frustumCulled={false} />
    <mesh geometry={exitGeo} material={exitMat} frustumCulled={false} renderOrder={5} />
  </>
}

export default function TunnelScene(props: Props) {
  return <Canvas
    dpr={props.narrow ? 1 : [1, 1.5]}
    gl={{ antialias: !props.narrow, powerPreference: 'high-performance' }}
    camera={{ fov: 72, near: 0.05, far: 90, position: [0, 0, 0] }}
    aria-hidden="true"
  >
    <Tunnel {...props} />
  </Canvas>
}
