import { CameraControls, useTexture } from "@react-three/drei";
import { CanvasCapture } from "@packages/r3f-gist/components/utility";
import { useVATPreloader } from "./vat/VATPreloader";
import { VATMesh } from "./vat/VATMesh";
import EnvironmentSetup from "./EnvironmentSetup";
import Lights from "./Lights";
import { VATInstancedMesh } from "./vat/VATInstancedMesh";
import { useMemo } from "react";
import * as THREE from "three";

export default function Scene() {
    const { scene, posTex, nrmTex, meta, isLoaded } = useVATPreloader(
        '/vat/Rose.gltf',
        '/vat/Rose_pos.exr',
        '/vat/Rose_nrm.png',
        '/vat/Rose_meta.json')


    const count = 2000
    const positions = useMemo(() =>{
        const positions = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
            positions[i * 3] = Math.random() * 2
            positions[i * 3 + 1] = 0
            positions[i * 3 + 2] = Math.random() * 2
        }
        return positions
    }, [count])
    const rotations = useMemo(() => {
        const rotations = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
            rotations[i * 3] = 0
            rotations[i * 3 + 1] = 0
            rotations[i * 3 + 2] = 0
        }
        return rotations
    }, [count])
    const scales = useMemo(() => {
        const scales = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
            scales[i * 3] = 1
            scales[i * 3 + 1] = 1
            scales[i * 3 + 2] = 1
        }
        return scales
    }, [count])

    const diffTex = useTexture('/textures/Rose Petal DIff.png')

    const materialConfig = useMemo(() => ({
        roughness: 1,
        metalness: 0,
        clearcoat: 0,
    }), [])

    const shaders = useMemo(() => ({
        fragmentShader: /* glsl */ `
            uniform vec3 uColor;
            varying vec2 vUv;
            varying vec2 vUv2;
            uniform sampler2D uDiffTex;
            void main() {
                vec2 uv = vUv;
                uv.x *= 0.99;
                vec4 color = texture2D(uDiffTex, uv);
                csm_DiffuseColor = color;
            }
        `,
        customUniforms: {
            uColor: { value: new THREE.Vector3(1.0, 0.0, 0.0) },
            uDiffTex: { value: diffTex }
        }
    }), [diffTex])

    return (
        <>
            <color attach="background" args={['#000000']} />
            <Lights />
            <EnvironmentSetup />

            <mesh rotation-x={-Math.PI / 2} receiveShadow>
                <planeGeometry args={[10, 10]} />
                <meshStandardMaterial color="white" />
            </mesh>

            <CameraControls makeDefault />

            <CanvasCapture />


            {isLoaded && (
                <VATMesh
                    scene={scene}
                    posTex={posTex}
                    nrmTex={nrmTex}
                    metaData={meta}
                    frameRatio={0.5}
                    scale={10}
                    materialConfig={materialConfig}
                    shaders={shaders}
                />



                // Use the instanced mesh
                // <VATInstancedMesh
                //     scene={scene}
                //     posTex={posTex}
                //     nrmTex={nrmTex}
                //     metaData={meta}
                //     count={count}
                //     positions={positions}
                //     rotations={rotations}
                //     scales={scales}
                //     useDepthMaterial={true}
                // />

            )}
        </>
    )
}

