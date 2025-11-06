import * as THREE from 'three'
import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'
import { VATMeta } from '../types'
import frameComputeShader from '../shaders/frameCompute.glsl'

interface UseFrameComputeParams {
  instanceCount: number
  metaData: VATMeta
  vatSpeed?: number
  frameRatio?: number
  paused?: boolean
  instanceSeeds?: Float32Array // Optional: per-instance seeds
  stateDurations?: {
    state0?: number | { min: number; max: number } // Frame stays at 0 (default: 0)
    state1?: number | { min: number; max: number } // Frame animates from 0 to 1 (default: 1)
    state2?: number | { min: number; max: number } // Frame stays at 1 (default: 0)
    state3?: number | { min: number; max: number } // Frame animates from 1 to 0 (default: 1)
  }
}

/**
 * Hook to create and manage FBO compute shader for per-instance frame values
 * Returns the texture containing frame values for each instance
 */
export function useFrameCompute({
  instanceCount,
  metaData,
  vatSpeed = 1,
  frameRatio,
  paused = false,
  instanceSeeds,
  stateDurations = {},
}: UseFrameComputeParams) {
  const { gl } = useThree()
  
  // Calculate texture dimensions (1D array: width = instanceCount, height = 1)
  const textureWidth = instanceCount
  const textureHeight = 1
  
  // Create ping-pong FBO targets
  const pingTarget = useFBO(textureWidth, textureHeight, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
  })
  
  const pongTarget = useFBO(textureWidth, textureHeight, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
  })
  
  // Track which FBO is currently the read target (we write to the other one)
  const readTargetRef = useRef<THREE.WebGLRenderTarget>(pingTarget)
  const writeTargetRef = useRef<THREE.WebGLRenderTarget>(pongTarget)
  
  // Create scene and camera for FBO rendering
  const computeScene = useMemo(() => new THREE.Scene(), [])
  const computeCamera = useMemo(
    () => new THREE.OrthographicCamera(-1, 1, 1, -1, 1 / Math.pow(2, 53), 1),
    []
  )
  
  // Create geometry for fullscreen quad
  const quadGeometry = useMemo(() => {
    const positions = new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0])
    const uvs = new Float32Array([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0])
    
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    return geometry
  }, [])
  
  // Create instance seeds texture if provided
  const instanceSeedsTexture = useMemo(() => {
    if (!instanceSeeds || instanceSeeds.length === 0 || instanceSeeds.length < instanceCount) {
      return null
    }
    
    // Create a 1D texture from seeds array
    // Ensure we have enough data
    const seedsData = instanceSeeds.length >= instanceCount 
      ? instanceSeeds.slice(0, instanceCount)
      : new Float32Array(instanceCount)
    
    const texture = new THREE.DataTexture(
      seedsData,
      instanceCount,
      1,
      THREE.RedFormat,
      THREE.FloatType
    )
    texture.needsUpdate = true
    return texture
  }, [instanceSeeds, instanceCount])
  
  // Helper function to get min and max values
  const getDurationConfig = (value: number | { min: number; max: number } | undefined, defaultValue: number) => {
    if (value === undefined) return { min: defaultValue, max: defaultValue }
    if (typeof value === 'number') return { min: value, max: value }
    return { min: value.min, max: value.max }
  }

  // Get state duration configs
  const state0Config = getDurationConfig(stateDurations.state0, 0)
  const state1Config = getDurationConfig(stateDurations.state1, 1)
  const state2Config = getDurationConfig(stateDurations.state2, 0)
  const state3Config = getDurationConfig(stateDurations.state3, 1)

  // Create DataTexture for per-instance state durations
  // Each pixel stores: R=state0, G=state1, B=state2, A=state3
  const stateDurationsTexture = useMemo(() => {
    const data = new Float32Array(instanceCount * 4) // RGBA per instance
    
    for (let i = 0; i < instanceCount; i++) {
      // Generate random seed for this instance (for consistent randomization)
      const seed = instanceSeeds && instanceSeeds.length > i ? instanceSeeds[i] : Math.random()
      
      // Random number generator using seed (seeded random for consistency)
      const seededRandom = (seedValue: number, offset: number) => {
        const x = Math.sin(seedValue * offset * 12.9898) * 43758.5453
        return x - Math.floor(x)
      }
      
      const random = (min: number, max: number, offset: number = 1) => {
        const r = seededRandom(seed, offset)
        return min + r * (max - min)
      }
      
      // Calculate randomized durations for this instance
      // Each state uses a different offset to ensure independent randomization
      // Random value between min and max
      const state0 = Math.max(0, random(state0Config.min, state0Config.max, 1))
      const state1 = Math.max(0, random(state1Config.min, state1Config.max, 2))
      const state2 = Math.max(0, random(state2Config.min, state2Config.max, 3))
      const state3 = Math.max(0, random(state3Config.min, state3Config.max, 4))
      
      // Store in texture (RGBA format)
      data[i * 4 + 0] = state0 // R
      data[i * 4 + 1] = state1 // G
      data[i * 4 + 2] = state2 // B
      data[i * 4 + 3] = state3 // A
    }
    
    const texture = new THREE.DataTexture(
      data,
      instanceCount,
      1,
      THREE.RGBAFormat,
      THREE.FloatType
    )
    texture.needsUpdate = true
    return texture
  }, [instanceCount, instanceSeeds, state0Config.min, state0Config.max, state1Config.min, state1Config.max, state2Config.min, state2Config.max, state3Config.min, state3Config.max])

  // Create compute shader material
  const computeMaterial = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uVatSpeed: { value: vatSpeed },
        uFrames: { value: metaData.frameCount },
        uFps: { value: metaData.fps || 24 },
        uFrameRatio: { value: frameRatio !== undefined ? frameRatio : -1 },
        uInstanceSeeds: { value: instanceSeedsTexture || null },
        uHasInstanceSeeds: { value: instanceSeedsTexture ? 1.0 : 0.0 },
        uPreviousFrame: { value: pingTarget.texture }, // Previous frame texture (ping-pong)
        uInstanceCount: { value: instanceCount }, // For texture sampling
        uStateDurations: { value: stateDurationsTexture }, // Per-instance state durations texture
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: frameComputeShader,
    })
    return material
  }, [vatSpeed, metaData, frameRatio, instanceSeedsTexture, pingTarget.texture, instanceCount, stateDurationsTexture])
  
  // Create mesh for compute shader
  const computeMesh = useMemo(() => {
    const mesh = new THREE.Mesh(quadGeometry, computeMaterial)
    computeScene.add(mesh)
    return mesh
  }, [quadGeometry, computeMaterial, computeScene])
  
  // Update instance seeds texture when it changes
  useEffect(() => {
    if (computeMaterial.uniforms.uInstanceSeeds && instanceSeedsTexture) {
      computeMaterial.uniforms.uInstanceSeeds.value = instanceSeedsTexture
      computeMaterial.uniforms.uHasInstanceSeeds.value = 1.0
      computeMaterial.needsUpdate = true
    } else if (computeMaterial.uniforms.uHasInstanceSeeds) {
      computeMaterial.uniforms.uHasInstanceSeeds.value = 0.0
    }
  }, [computeMaterial, instanceSeedsTexture])
  
  // Initialize first frame with default values
  const isInitializedRef = useRef(false)
  
  // Update uniforms and render to FBO each frame with ping-pong
  useFrame((state) => {
    if (paused) return
    
    // Initialize first frame - render to both targets with initial values
    if (!isInitializedRef.current) {
      const currentRenderTarget = gl.getRenderTarget()
      const currentXrEnabled = gl.xr.enabled
      const currentShadowAutoUpdate = gl.shadowMap.autoUpdate
      
      gl.xr.enabled = false
      gl.shadowMap.autoUpdate = false
      
      // Render initial frame to ping target
      gl.setRenderTarget(pingTarget)
      gl.clear()
      gl.render(computeScene, computeCamera)
      
      // Render initial frame to pong target
      gl.setRenderTarget(pongTarget)
      gl.clear()
      gl.render(computeScene, computeCamera)
      
      gl.setRenderTarget(currentRenderTarget)
      gl.xr.enabled = currentXrEnabled
      gl.shadowMap.autoUpdate = currentShadowAutoUpdate
      
      isInitializedRef.current = true
      return
    }
    
    // Update time uniform
    if (computeMaterial.uniforms.uTime) {
      computeMaterial.uniforms.uTime.value = state.clock.elapsedTime
    }
    
    // Update previous frame texture uniform (read from current read target)
    if (computeMaterial.uniforms.uPreviousFrame) {
      computeMaterial.uniforms.uPreviousFrame.value = readTargetRef.current.texture
    }
    
    // Render to write target (ping-pong)
    const currentRenderTarget = gl.getRenderTarget()
    const currentXrEnabled = gl.xr.enabled
    const currentShadowAutoUpdate = gl.shadowMap.autoUpdate
    
    gl.xr.enabled = false
    gl.shadowMap.autoUpdate = false
    gl.setRenderTarget(writeTargetRef.current)
    gl.clear()
    gl.render(computeScene, computeCamera)
    gl.setRenderTarget(currentRenderTarget)
    
    gl.xr.enabled = currentXrEnabled
    gl.shadowMap.autoUpdate = currentShadowAutoUpdate
    
    // Swap ping-pong targets for next frame
    const temp = readTargetRef.current
    readTargetRef.current = writeTargetRef.current
    writeTargetRef.current = temp
  })
  
  // Cleanup
  useEffect(() => {
    return () => {
      computeScene.remove(computeMesh)
      computeMesh.geometry.dispose()
      computeMaterial.dispose()
      if (instanceSeedsTexture) {
        instanceSeedsTexture.dispose()
      }
      if (stateDurationsTexture) {
        stateDurationsTexture.dispose()
      }
    }
  }, [computeScene, computeMesh, computeMaterial, instanceSeedsTexture, stateDurationsTexture])
  
  // Return the current frame texture
  // Note: After initialization and first frame, readTargetRef points to the most recently written frame
  // which is the current frame. The texture reference is stable, but its contents are updated each frame.
  return readTargetRef.current.texture
}

