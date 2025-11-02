// Main exports for VAT components
export { VATMesh } from './VATMesh'

// Hooks
export { useVATPreloader } from './VATPreloader'

// Type exports
export type {
  VATMeta,
  VATMaterialControls,
  VATMeshProps,
} from './types'

// Utility exports
export {
  ensureUV2ForVAT,
  calculateVATFrame,
  setupVATMaterials,
  cloneAndSetupVATScene
} from './utils'

// Material exports
export {
  createVATMaterial,
  createVATDepthMaterial
} from './materials'
