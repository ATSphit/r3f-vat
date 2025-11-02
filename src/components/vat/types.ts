import * as THREE from 'three'

// Core VAT metadata interface
export interface VATMeta {
  vertexCount: number
  frameCount: number
  fps: number
  texWidth: number
  texHeight: number
  columns: number
  frameStride: number
  storeDelta: boolean
  normalsCompressed: boolean
}

// Material controls interface
export interface VATMaterialControls {
  roughness: number
  metalness: number
  transmission: number
  thickness: number
  ior: number
  clearcoat: number
  clearcoatRoughness: number
  reflectivity: number
  envMapIntensity: number
  sheen: number
  sheenRoughness: number
  sheenColor: string
  iridescence: number
  iridescenceIOR: number
  iridescenceThicknessMin: number
  iridescenceThicknessMax: number
  attenuationDistance: number
  attenuationColor: string
  bumpScale: number
}

// Common VAT props shared across components
export interface CommonVATProps {
  scene: THREE.Group
  posTex: THREE.Texture
  nrmTex?: THREE.Texture | null
  metaData: VATMeta
  position?: [number, number, number]
  id?: string | number
}

// VATMesh props interface
export interface VATMeshProps extends CommonVATProps {
  vatSpeed?: number
  paused?: boolean
  useDepthMaterial?: boolean
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
  frameRatio?: number
}
