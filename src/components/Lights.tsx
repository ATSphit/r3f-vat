import { useRef, useEffect } from 'react'
import { useControls } from 'leva'
import * as THREE from 'three'
import { ShadowCameraHelper } from '@packages/r3f-gist/components'

export default function Lights() {
    const lightRef = useRef<THREE.DirectionalLight>(null)
    
    // Leva controls for shadow camera bounds
    const shadowControls = useControls('Shadow Camera', {
        showHelper: { value: false, label: 'Show Helper' },
        mapSize: { value: 2048, min: 512, max: 4096, step: 512, label: 'Map Size' },
        left: { value: -5, label: 'Left' },
        right: { value: 5, label: 'Right' },
        top: { value: 5, label: 'Top' },
        bottom: { value: -5, label: 'Bottom' },
        near: { value: 0.1, min: 0.1, max: 10, label: 'Near' },
        far: { value: 50, min: 1, max: 200, label: 'Far' },
    }, { collapsed: true })
    
    // Update shadow camera bounds when controls change
    useEffect(() => {
        if (lightRef.current?.shadow) {
            const camera = lightRef.current.shadow.camera as THREE.OrthographicCamera
            camera.left = shadowControls.left
            camera.right = shadowControls.right
            camera.top = shadowControls.top
            camera.bottom = shadowControls.bottom
            camera.near = shadowControls.near
            camera.far = shadowControls.far
            camera.updateProjectionMatrix()
            
            lightRef.current.shadow.mapSize.width = shadowControls.mapSize
            lightRef.current.shadow.mapSize.height = shadowControls.mapSize
        }
    }, [shadowControls])

    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight 
                ref={lightRef}
                position={[10, 10, 10]} 
                intensity={1} 
                castShadow
                shadow-mapSize-width={shadowControls.mapSize}
                shadow-mapSize-height={shadowControls.mapSize}
                shadow-camera-left={shadowControls.left}
                shadow-camera-right={shadowControls.right}
                shadow-camera-top={shadowControls.top}
                shadow-camera-bottom={shadowControls.bottom}
                shadow-camera-near={shadowControls.near}
                shadow-camera-far={shadowControls.far}
            />
            <ShadowCameraHelper 
                lightRef={lightRef} 
                visible={shadowControls.showHelper}
            />
        </>
    )
}