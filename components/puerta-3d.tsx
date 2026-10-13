'use client'

import { useLayoutEffect, useMemo } from 'react'
import type { MutableRefObject } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

// Puerta corrediza doble (public/modelos/puerta.glb, comprimida con Draco). La usan el hero y la sección 4:
// el modelo se carga una sola vez (useLoader lo cachea) y cada uso clona su propia copia.
// Medidas: 3,47 m de ancho con el marco y 2,3 m de alto; origen en el centro del umbral, frente hacia +Z.
export const PUERTA = { width: 3.47, height: 2.3, gap: 1.64 } // gap: ancho del paso con las hojas abiertas
export const PUERTA_URL = '/modelos/puerta.glb'
// El modelo viene ABIERTO. Para cerrar, hoja-izq se corre +SLIDE en X y hoja-der −SLIDE (se encuentran en x = 0).
const SLIDE = 0.824

export const withDraco = (loader: GLTFLoader) => {
  const draco = new DRACOLoader(); draco.setDecoderPath('/draco/'); loader.setDRACOLoader(draco)
}

// Materiales del brand book, mate tipo gomita. El vidrio es translúcido y con un brillo cálido que deja pasar la luz.
const matte = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0 })
const MATERIALS = {
  marco: { 'marco-blanco': matte('#FF4DA6'), metal: matte('#F72F90') } as Record<string, THREE.Material>,
  hoja: { 'marco-blanco': matte('#FF83C2'), manijas: matte('#FFD93D'), metal: matte('#FF83C2'), 'detalles-oscuros': matte('#F72F90') } as Record<string, THREE.Material>,
}
function glassMaterial() {
  return new THREE.MeshStandardMaterial({ color: '#FFE9C7', emissive: '#FFC27A', emissiveIntensity: 0.6, roughness: 0.25, transparent: true, opacity: 0.5, depthWrite: false })
}

/** open: 0 cerrada → 1 abierta (las hojas se deslizan solo en X). */
export function Puerta3D({ open, position, scale = 1 }: { open: MutableRefObject<number>; position?: [number, number, number]; scale?: number }) {
  const gltf = useLoader(GLTFLoader, PUERTA_URL, withDraco)
  const { scene, izq, der, baseIzq, baseDer } = useMemo(() => {
    const scene = gltf.scene.clone(true)
    const glass = glassMaterial()
    const paint = (part: THREE.Object3D | undefined, set: Record<string, THREE.Material>, fallback: THREE.Material) => part?.traverse(o => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const name = (m.material as THREE.Material).name
      m.material = name === 'vidrio' ? glass : set[name] ?? fallback
    })
    const izq = scene.getObjectByName('hoja-izq'), der = scene.getObjectByName('hoja-der')
    paint(scene.getObjectByName('marco'), MATERIALS.marco, MATERIALS.marco['marco-blanco'])
    paint(izq, MATERIALS.hoja, MATERIALS.hoja['marco-blanco'])
    paint(der, MATERIALS.hoja, MATERIALS.hoja['marco-blanco'])
    return { scene, izq, der, baseIzq: izq?.position.x ?? 0, baseDer: der?.position.x ?? 0 }
  }, [gltf])

  const place = () => {
    const shut = 1 - Math.min(1, Math.max(0, open.current))
    if (izq) izq.position.x = baseIzq + SLIDE * shut
    if (der) der.position.x = baseDer - SLIDE * shut
  }
  // Ya en el primer cuadro: el modelo viene abierto y, con frameloop "demand", sin esto se veía abierto hasta scrollear.
  useLayoutEffect(place)
  useFrame(place)
  return <primitive object={scene} position={position} scale={scale} />
}
