'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { ATLAS_COLUMNS, ATLAS_ROWS } from '@/lib/tunnel-assets'

// Túnel cuadrado de 2 × 2 (la cámara va por el eje). Todo el movimiento sale de UN solo valor de tiempo t (0 → 1):
// de t se calcula en JS la posición de la cámara y la velocidad (dos escalares por cuadro) y los shaders hacen el resto
// (reciclado de bloques, brillo por cercanía y velocidad, estela, luz de salida). No se recorren bloques en JS.
const EXIT = 40 // profundidad de la salida (rectángulo de luz)
const LOOP = 48 // largo del tramo de bloques reciclables
const CELL = 0.5 // casillero de la grilla (4 por cara)
const CELLS = LOOP / CELL

const PALETTE = ['#FF4DA6', '#6D28D9', '#00E6D2', '#FFD93D', '#EF4444', '#D946EF', '#2563EB', '#38BDF8', '#22C55E', '#F97316']
const hex = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255] }
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

type Uniforms = {
  uCamZ: { value: number }; uSpeed: { value: number }; uBlur: { value: number }; uExitScale: { value: number }
  uGlow: { value: number }; uRes: { value: THREE.Vector2 }; uAtlas: { value: THREE.Texture | null }
}
const WALLS_VERT = /* glsl */`
  attribute float aAcross;
  varying vec3 vW; varying float vAc;
  void main() { vW = position; vAc = aAcross; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`
const WALLS_FRAG = /* glsl */`
  uniform float uCamZ, uSpeed, uBlur, uGlow; uniform vec2 uRes;
  varying vec3 vW; varying float vAc;
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
    float l = max(acc / 5.0, max(lines(vAc, ${CELL.toFixed(2)}, w), lines(vAc, 2.0, w * 1.6)));
    float a = l * 0.3 * (1.0 + uSpeed * 0.9) * (1.0 - smoothstep(16.0, 46.0, dist) * 0.88);
    vec3 col = mix(vec3(0.059, 0.059, 0.063), vec3(1.0, 0.706, 0.847), a);
    // La luz cálida de la salida se derrama sobre las paredes cercanas.
    float toExit = vW.z + ${EXIT.toFixed(1)};
    col += vec3(1.0, 0.78, 0.5) * smoothstep(16.0, 0.0, toExit) * 0.42 * uGlow;
    gl_FragColor = vec4(col, 1.0);
  }`

const BLOCK_VERT = /* glsl */`
  attribute vec4 aInst;   // x: cara (0 piso · 1 techo · 2 izquierda · 3 derecha), y: carril, z: profundidad base, w: foto (−1 = color)
  attribute vec3 aColor;
  uniform float uCamZ, uSpeed, uBlur;
  varying vec3 vN; varying vec3 vCol; varying float vTile; varying vec3 vLocal; varying vec3 vLN; varying float vDist;
  void main() {
    // Reciclado: el bloque da la vuelta cuando la cámara lo pasa (siempre hay LOOP de bloques por delante).
    float travelled = -uCamZ;
    float d = mod(aInst.z - travelled, ${LOOP.toFixed(1)}) + 0.5;
    float wz = uCamZ - d;
    float lane = (aInst.y + 0.5) * ${CELL.toFixed(2)} - 1.0;
    vec3 p = position * vec3(0.42, 0.14, 0.42 * (1.0 + 2.4 * uBlur * uSpeed));   // y = hacia adentro del túnel
    vec3 n = normal;
    vec3 c; vec3 off;
    if (aInst.x < 0.5)      { c = vec3(lane, -1.0, wz); off = vec3(0.0, 0.07, 0.0); }
    else if (aInst.x < 1.5) { c = vec3(lane, 1.0, wz);  p.y = -p.y; n.y = -n.y; off = vec3(0.0, -0.07, 0.0); }
    else if (aInst.x < 2.5) { c = vec3(-1.0, lane, wz); p = vec3(p.y, p.x, p.z); n = vec3(n.y, n.x, n.z); off = vec3(0.07, 0.0, 0.0); }
    else                    { c = vec3(1.0, lane, wz);  p = vec3(-p.y, p.x, p.z); n = vec3(-n.y, n.x, n.z); off = vec3(-0.07, 0.0, 0.0); }
    vec3 w = c + p + off;
    vN = n; vCol = aColor; vTile = aInst.w; vLocal = position + 0.5; vLN = normal; vDist = d;
    if (wz < -${EXIT.toFixed(1)} + 0.4) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }   // pasada la salida no se dibuja
    gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  }`
const BLOCK_FRAG = /* glsl */`
  uniform float uSpeed, uGlow; uniform sampler2D uAtlas;
  varying vec3 vN; varying vec3 vCol; varying float vTile; varying vec3 vLocal; varying vec3 vLN; varying float vDist;
  void main() {
    vec3 col = vCol;
    if (vTile > -0.5 && vLN.y > 0.5) {   // cara que mira hacia adentro: foto del producto
      float t = floor(vTile + 0.5), cx = mod(t, ${ATLAS_COLUMNS}.0), cy = floor(t / ${ATLAS_COLUMNS}.0);
      vec2 uv = vec2((cx + vLocal.x) / ${ATLAS_COLUMNS}.0, 1.0 - (cy + 1.0 - vLocal.z) / ${ATLAS_ROWS}.0);
      col = texture2D(uAtlas, uv).rgb;
    }
    float diff = 0.5 + 0.5 * dot(normalize(vN), normalize(vec3(0.3, 0.8, 0.5)));
    col *= 0.62 + 0.46 * diff;   // mate, tipo gomita
    // Los bloques que se acercan brillan más (y más rápido cuanto mayor es la velocidad).
    col *= 1.0 + 1.35 * smoothstep(15.0, 2.5, vDist) * (0.55 + 0.8 * uSpeed);
    col = mix(col, vec3(0.059, 0.059, 0.063), smoothstep(26.0, 46.0, vDist));
    col += vec3(1.0, 0.78, 0.5) * 0.12 * uGlow;
    gl_FragColor = vec4(col, 1.0);
  }`

const EXIT_VERT = /* glsl */`
  varying vec2 vUv; uniform float uExitScale;
  void main() { vUv = position.xy; vec3 p = vec3(position.xy * (1.0 + uExitScale), position.z - ${EXIT.toFixed(1)}); gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`
const EXIT_FRAG = /* glsl */`
  varying vec2 vUv; uniform float uExitScale;
  void main() {
    // Rectángulo de luz cálida: bordes redondeados y suaves; al crecer llena la pantalla y queda en el crema del catálogo.
    float d = max(abs(vUv.x), abs(vUv.y));
    float soft = 0.12 + uExitScale * 0.25;
    float mask = 1.0 - smoothstep(1.0 - soft, 1.0, d + length(vUv) * 0.12);
    vec3 col = mix(vec3(1.0, 0.847, 0.659), vec3(1.0, 0.976, 0.961), smoothstep(1.0, 0.0, d));
    gl_FragColor = vec4(col, mask);
  }`

function buildWalls() {
  const zNear = 4, zFar = -(EXIT + 2)
  const pos: number[] = [], across: number[] = [], idx: number[] = []
  const quad = (a: number[], b: number[], c: number[], d: number[], ac: [number, number, number, number]) => {
    const i = pos.length / 3
    pos.push(...a, ...b, ...c, ...d); across.push(...ac); idx.push(i, i + 1, i + 2, i, i + 2, i + 3)
  }
  quad([-1, -1, zNear], [1, -1, zNear], [1, -1, zFar], [-1, -1, zFar], [-1, 1, 1, -1])   // piso
  quad([-1, 1, zNear], [1, 1, zNear], [1, 1, zFar], [-1, 1, zFar], [-1, 1, 1, -1])       // techo
  quad([-1, -1, zNear], [-1, 1, zNear], [-1, 1, zFar], [-1, -1, zFar], [-1, 1, 1, -1])   // izquierda
  quad([1, -1, zNear], [1, 1, zNear], [1, 1, zFar], [1, -1, zFar], [-1, 1, 1, -1])       // derecha
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('aAcross', new THREE.Float32BufferAttribute(across, 1))
  g.setIndex(idx)
  return g
}

// Bloques al azar: no en todos los casilleros (≈ 10 % de los 1.536 posibles), sin repetir lugar; ≈ 28 % con foto.
function buildInstances(count: number, tiles: number) {
  const used = new Set<number>(), inst = new Float32Array(count * 4), col = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    let face = 0, lane = 0, z = 0, key = 0
    do { face = (Math.random() * 4) | 0; lane = (Math.random() * 4) | 0; z = (Math.random() * CELLS) | 0; key = (face * 4 + lane) * CELLS + z } while (used.has(key))
    used.add(key)
    inst.set([face, lane, (z + 0.5) * CELL, tiles > 0 && Math.random() < 0.28 ? (Math.random() * tiles) | 0 : -1], i * 4)
    col.set(hex(PALETTE[(Math.random() * PALETTE.length) | 0]), i * 3)
  }
  return { inst, col }
}

type Props = { atlas: HTMLCanvasElement; tiles: number; narrow: boolean; duration: number; onEnd: () => void }

function Tunnel({ atlas, tiles, narrow, duration, onEnd }: Props) {
  const { camera, size, gl } = useThree()
  const mesh = useRef<THREE.InstancedMesh>(null)
  const state = useRef({ frame: 0, start: -1, ended: false, sample: 0, samples: 0 })
  const texture = useMemo(() => { const t = new THREE.CanvasTexture(atlas); t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = true; return t }, [atlas])
  const uniforms = useMemo<Uniforms>(() => ({
    uCamZ: { value: 0 }, uSpeed: { value: 0 }, uBlur: { value: narrow ? 0 : 1 }, uExitScale: { value: 0 }, uGlow: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) }, uAtlas: { value: texture },
  }), [narrow, texture])
  const blocks = narrow ? 70 : 150
  const walls = useMemo(buildWalls, [])
  const { geometry, material, wallMat, exitMat, exitGeo } = useMemo(() => {
    const geometry = new RoundedBoxGeometry(1, 1, 1, 2, 0.14)
    const { inst, col } = buildInstances(blocks, tiles)
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
  }, [blocks, tiles, uniforms])

  useEffect(() => { gl.outputColorSpace = THREE.LinearSRGBColorSpace; gl.setClearColor('#0F0F10', 1) }, [gl])
  // Libera la memoria de la GPU al terminar (el canvas se desmonta justo después).
  useEffect(() => () => { geometry.dispose(); material.dispose(); wallMat.dispose(); exitMat.dispose(); exitGeo.dispose(); walls.dispose(); texture.dispose() }, [geometry, material, wallMat, exitMat, exitGeo, walls, texture])

  useFrame((s, dt) => {
    const st = state.current
    st.frame++
    uniforms.uRes.value.set(size.width * gl.getPixelRatio(), size.height * gl.getPixelRatio())
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
    // Si el dispositivo no llega a ≈ 48 cuadros por segundo, se reduce la cantidad de bloques automáticamente.
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
