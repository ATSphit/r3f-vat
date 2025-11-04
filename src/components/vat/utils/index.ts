import * as THREE from 'three'
import CustomShaderMaterial from 'three-custom-shader-material/vanilla'
import { VATMeta, VATShaderOverrides, VATMeshConfig } from '../types'
import { createVATMaterial, createVATDepthMaterial } from '../materials'


/**
 * Ensure UV2 attribute exists for VAT geometry
 */
export function ensureUV2ForVAT(geometry: THREE.BufferGeometry, meta: VATMeta): void {
  if (geometry.getAttribute('uv2')) return

  const count = geometry.getAttribute('position').count
  const uv2Array = new Float32Array(count * 2)

  for (let i = 0; i < count; i++) {
    const colIndex = Math.floor(i / meta.texHeight)
    const vIndex = i % meta.texHeight
    const px = colIndex * meta.frameStride
    const py = vIndex
    const u = (px + 0.5) / meta.texWidth
    const v = (py + 0.5) / meta.texHeight

    uv2Array[2 * i + 0] = u
    uv2Array[2 * i + 1] = v
  }

  geometry.setAttribute('uv2', new THREE.BufferAttribute(uv2Array, 2))
}

// ========== VAT Material Setup Utils ==========

/**
 * Common material creation parameters
 */
interface VATMaterialParams {
  posTex: THREE.Texture
  nrmTex: THREE.Texture | null
  envMap: THREE.Texture | null
  metaData: VATMeta
  materialControls: any
  shaderOverrides?: VATShaderOverrides
  customUniforms?: Record<string, any>
}

/**
 * Create VAT materials (main and optionally depth)
 */
function createVATMaterials(
  params: VATMaterialParams,
  useDepthMaterial: boolean
): {
  vatMaterial: CustomShaderMaterial
  vatDepthMaterial?: CustomShaderMaterial
  materials: CustomShaderMaterial[]
} {
  const materials: CustomShaderMaterial[] = []
  
  const vatMaterial = createVATMaterial(
    params.posTex,
    params.nrmTex,
    params.envMap,
    params.metaData,
    params.materialControls,
    params.shaderOverrides,
    params.customUniforms
  )
  materials.push(vatMaterial)

  let vatDepthMaterial: CustomShaderMaterial | undefined
  if (useDepthMaterial) {
    vatDepthMaterial = createVATDepthMaterial(
      params.posTex,
      params.nrmTex,
      params.metaData,
      params.shaderOverrides,
      params.customUniforms
    )
    materials.push(vatDepthMaterial)
  }

  return { vatMaterial, vatDepthMaterial, materials }
}

/**
 * Configure mesh shadow and culling properties
 */
function configureMeshProperties(
  mesh: THREE.Mesh | THREE.InstancedMesh,
  meshConfig?: VATMeshConfig
): void {
  const defaultConfig: VATMeshConfig = {
    frustumCulled: false,
    castShadow: true,
    receiveShadow: true
  }
  Object.assign(mesh, { ...defaultConfig, ...meshConfig })
}

/**
 * Create VAT mesh from geometry (similar to createVATInstancedMesh but for single mesh)
 */
export function createVATMesh(
  geometry: THREE.BufferGeometry,
  posTex: THREE.Texture,
  nrmTex: THREE.Texture | null,
  envMap: THREE.Texture | null,
  metaData: VATMeta,
  materialControls: any,
  useDepthMaterial: boolean,
  shaderOverrides?: VATShaderOverrides,
  customUniforms?: Record<string, any>,
  meshConfig?: VATMeshConfig
): {
  mesh: THREE.Mesh
  materials: CustomShaderMaterial[]
} {
  ensureUV2ForVAT(geometry, metaData)

  const { vatMaterial, vatDepthMaterial, materials } = createVATMaterials(
    { posTex, nrmTex, envMap, metaData, materialControls, shaderOverrides, customUniforms },
    useDepthMaterial
  )

  const mesh = new THREE.Mesh(geometry, vatMaterial)
  
  if (vatDepthMaterial) {
    mesh.customDepthMaterial = vatDepthMaterial
  }

  configureMeshProperties(mesh, meshConfig)

  return { mesh, materials }
}

/**
 * Calculate VAT frame based on animation mode
 */
export function calculateVATFrame(
  frameRatio: number | undefined,
  currentTime: number,
  metaData: VATMeta,
  speed: number
): number {
  if (frameRatio !== undefined) {
    return Math.min(frameRatio * metaData.frameCount, metaData.frameCount - 5)
  }
  return currentTime * (metaData.fps * speed) % metaData.frameCount
}

/**
 * Extract geometry from a THREE.Group/Scene
 */
export function extractGeometryFromScene(scene: THREE.Group): THREE.BufferGeometry | null {
  let geometry: THREE.BufferGeometry | null = null
  
  scene.traverse((object: any) => {
    if (object.isMesh && object.geometry && !geometry) {
      geometry = object.geometry.clone()
    }
  })
  
  return geometry
}

/**
 * Create VAT InstancedMesh
 */
export function createVATInstancedMesh(
  geometry: THREE.BufferGeometry,
  posTex: THREE.Texture,
  nrmTex: THREE.Texture | null,
  envMap: THREE.Texture | null,
  metaData: VATMeta,
  materialControls: any,
  instanceCount: number,
  useDepthMaterial: boolean,
  shaderOverrides?: VATShaderOverrides,
  customUniforms?: Record<string, any>,
  meshConfig?: VATMeshConfig
): {
  instancedMesh: THREE.InstancedMesh
  materials: CustomShaderMaterial[]
} {
  ensureUV2ForVAT(geometry, metaData)

  const { vatMaterial, vatDepthMaterial, materials } = createVATMaterials(
    { posTex, nrmTex, envMap, metaData, materialControls, shaderOverrides, customUniforms },
    useDepthMaterial
  )

  const instancedMesh = new THREE.InstancedMesh(geometry, vatMaterial, instanceCount)
  
  if (vatDepthMaterial) {
    instancedMesh.customDepthMaterial = vatDepthMaterial
  }

  configureMeshProperties(instancedMesh, meshConfig)

  return { instancedMesh, materials }
}
