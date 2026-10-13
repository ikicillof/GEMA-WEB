'use client'

import * as THREE from 'three'

// Piezas que comparten las escenas del desfile y del cuarto: la cara del Gemi y el material del Perro Globo.

// Cara del Gemi ilustrado (gemi-sidekick.tsx, viewBox 100×116, gema de y=5 a y=111) llevada al modelo (alto 1,98, centrado):
// cada unidad del SVG mide K en el modelo y el centro del SVG (50, 58) es el origen.
const K = 1.98 / 106

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

// Perro globo: un solo azul de la paleta (Azul, #2563EB) con sombras suaves para que tenga volumen, pero SIN depender de
// las luces ni de las normales del modelo (de ahí salían las vetas): el sombreado sale solo de la posición. Más claro
// arriba y a la izquierda (donde pega la luz), más oscuro abajo y a la derecha, siempre en tonos del mismo azul.
export function perroMaterial(root: THREE.Object3D) {
  let mesh: THREE.Mesh | null = null
  root.traverse(o => { if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh })
  const box = new THREE.Box3()
  if (mesh) { const g = (mesh as THREE.Mesh).geometry; g.computeBoundingBox(); box.copy(g.boundingBox!) }
  const m = new THREE.MeshBasicMaterial({ color: '#2563EB' })
  m.onBeforeCompile = shader => {
    shader.uniforms.uBox = { value: new THREE.Vector4(box.min.x, box.min.y, box.max.x, box.max.y) }
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvP = position.xy;')
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec4 uBox;\nvarying vec2 vP;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 t = clamp((vP - uBox.xy) / max(uBox.zw - uBox.xy, vec2(1e-4)), 0.0, 1.0);
        float shade = 0.60 + 0.34 * smoothstep(0.0, 1.0, t.y) + 0.12 * (0.5 - t.x);
        diffuseColor.rgb *= clamp(shade, 0.55, 1.08);`)
  }
  m.customProgramCacheKey = () => 'gemma-perro'
  return m
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
