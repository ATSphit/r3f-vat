import { useTexture } from "@react-three/drei";
import { VATMesh } from "./vat/VATMesh";
import { VATInstancedMesh } from "./vat/VATInstancedMesh";
import { useVATPreloader } from "./vat/VATPreloader";
import { useControls } from "leva";
import { useMemo } from "react";
import * as THREE from "three";
import blending from "@packages/r3f-gist/shaders/cginc/math/blending.glsl"
import simplexNoise from "@packages/r3f-gist/shaders/cginc/noise/simplexNoise.glsl"
import utility from "@packages/r3f-gist/shaders/cginc/math/utility.glsl"
import vat from "./vat/shaders/vat.glsl"

export default function Rose() {
    const { scene, posTex, nrmTex, meta, isLoaded } = useVATPreloader(
        '/vat/Rose.glb',
        '/vat/Rose_pos.exr',
        '/vat/Rose_nrm.png',
        '/vat/Rose_meta.json')

    const petalTex = useTexture('/textures/Rose Petal DIff.png')
    petalTex.colorSpace = THREE.SRGBColorSpace

    const outlineTex = useTexture('/textures/Rose Outline.png')

    const normalMapTex = useTexture('/textures/Rose Petal Normal.png')
    normalMapTex.repeat.set(0.8, 1)
    normalMapTex.offset.set(0.1, 0)

    // Leva controls organized under VAT folder with subfolders
    const vatUniforms = useControls('VAT.Uniforms', {
        uGreen1: { value: '#325825', label: 'Green 1' },
        uGreen2: { value: '#4f802b', label: 'Green 2' },
    }, { collapsed: true })

    const noiseControls = useControls('VAT.Noise Effects', {
        displacementStrength: { value: 0.1, min: 0, max: 1, step: 0.01, label: 'Displacement Strength' },
        normalStrength: { value: 0.5, min: 0, max: 2, step: 0.1, label: 'Normal Strength' },
        noiseScale: { value: { x: 5, y: 20 }, label: 'Noise Scale' },
    }, { collapsed: true })

    const renderControls = useControls('VAT.Render', {
        useInstanced: { value: false, label: 'Use Instanced Mesh' },
        instanceCount: { value: 1000, min: 1, max: 10000, step: 100, label: 'Instance Count' },
    }, { collapsed: true })

    // Instance data for instanced mesh (ready for future use)
    const positions = useMemo(() => {
        const positions = new Float32Array(renderControls.instanceCount * 3)
        for (let i = 0; i < renderControls.instanceCount; i++) {
            positions[i * 3] = Math.random() * 2
            positions[i * 3 + 1] = 0
            positions[i * 3 + 2] = Math.random() * 2
        }
        return positions
    }, [renderControls.instanceCount])
    const rotations = useMemo(() => {
        const rotations = new Float32Array(renderControls.instanceCount * 3)
        for (let i = 0; i < renderControls.instanceCount; i++) {
            rotations[i * 3] = 0
            rotations[i * 3 + 1] = 0
            rotations[i * 3 + 2] = 0
        }
        return rotations
    }, [renderControls.instanceCount])
    const scales = useMemo(() => {
        const scales = new Float32Array(renderControls.instanceCount * 3)
        for (let i = 0; i < renderControls.instanceCount; i++) {
            scales[i * 3] = 1
            scales[i * 3 + 1] = 1
            scales[i * 3 + 2] = 1
        }
        return scales
    }, [renderControls.instanceCount])

    const materialConfig = useMemo(() => ({
        roughness: 1,
        metalness: 0.05,
        clearcoat: 0,
        sheen: 0,
        normalMap: normalMapTex,
        normalScale: new THREE.Vector2(4, 4),
    }), [normalMapTex])

    const customUniforms = useMemo(() => ({
        uColor: { value: new THREE.Vector3(1.0, 0.0, 0.0) },
        uGreen1: { value: new THREE.Color(vatUniforms.uGreen1) },
        uGreen2: { value: new THREE.Color(vatUniforms.uGreen2) },
        uPetalTex: { value: petalTex },
        uOutlineTex: { value: outlineTex },
        // Noise uniforms
        uDisplacementStrength: { value: noiseControls.displacementStrength },
        uNormalStrength: { value: noiseControls.normalStrength },
        uNoiseScale: { value: new THREE.Vector2(noiseControls.noiseScale.x, noiseControls.noiseScale.y) },
    }), [petalTex, vatUniforms.uGreen1, vatUniforms.uGreen2, outlineTex, noiseControls])

    // Memoize shader code separately - this should never change
    const shaders = useMemo(() => ({
        vertexShader: /* glsl */ `
            uniform float uDisplacementStrength;
            uniform float uNormalStrength;
            uniform vec2 uNoiseScale;
            
            varying vec2 vUv;
            varying vec3 vMask;
            
            ${vat}
            ${simplexNoise}
            ${utility}
            
            void main() {
                // Get the VAT position
                vec3 vatPos = VAT_pos(uFrame);
                vec3 basePos = position;
                vec3 position = (uStoreDelta == 1) ? (basePos + vatPos) : vatPos;
                
                // Get the VAT normal
                vec3 normal = VAT_nrm(uFrame);
                
                // Compute masks
                float epsilon = 0.05;
                vMask.x = step(abs(color.r - 0.7), epsilon); // petalMask
                vMask.y = step(abs(color.r - 0.0), epsilon); // leafMask
                vMask.z = step(abs(color.r - 1.0), epsilon); // stemMask

                csm_Position = position;
                csm_Normal = normal;
                vUv = uv;
                vUv2 = uv2;
                vColor = color.rgb;
            }
        `,

        fragmentShader: /* glsl */ `
            ${blending}
            ${simplexNoise}
            ${utility}

            uniform vec3 uColor;
            uniform vec3 uGreen1;
            uniform vec3 uGreen2;
            uniform vec3 uStemColor;
            uniform float uNormalStrength;
            uniform vec2 uNoiseScale;
            
            varying vec2 vUv;
            varying vec2 vUv2;
            varying vec3 vColor;
            varying vec3 vMask;
            
            uniform sampler2D uPetalTex;
            uniform sampler2D uOutlineTex;

            
            float fbm2(vec2 p, float t)
            {
                float f;
                f = 0.50000 * simplexNoise3d(vec3(p, t)); p = p * 2.01;
                f += 0.25000 * simplexNoise3d(vec3(p, t));
                return f * (1.0 / 0.75) * 0.5 + 0.5;
            }

            void main() {
                vec2 uv = vUv;
                uv.x = (uv.x - 0.5) * 0.8 + 0.5;
                vec4 outline = texture2D(uOutlineTex, vUv);
                
                // Use masks computed in vertex shader
                float petalMask = vMask.x;
                float leafMask = vMask.y;
                float stemMask = vMask.z;
                
                vec4 petalCol = texture2D(uPetalTex, uv);
                petalCol.rgb = mix(HSVShift(petalCol.rgb, vec3(0.0, 0.0, -.1)), petalCol.rgb, outline.rgb);

                float n = remap(fbm2(vUv * uNoiseScale, 0.0), vec2(-1.0, 1.0), vec2(0.0, 1.0));

                vec3 stemfCol = mix(uGreen1, uGreen2, n);
                vec3 finalColor = petalCol.rgb * petalMask + stemfCol * leafMask + stemfCol * stemMask;
                

                csm_DiffuseColor = vec4(finalColor, petalCol.a);
            }
        `
    }), [noiseControls])

    if (!isLoaded || !scene || !posTex || !nrmTex || !meta) {
        return null;
    }

    return (<>
        {renderControls.useInstanced ? (
            <VATInstancedMesh
                scene={scene}
                posTex={posTex}
                nrmTex={nrmTex}
                metaData={meta}
                count={renderControls.instanceCount}
                frameRatio={0.5}
                positions={positions}
                rotations={rotations}
                scales={scales}
                useDepthMaterial={true}
                materialConfig={materialConfig}
                shaders={shaders}
                customUniforms={customUniforms}
            />
        ) : (
            <VATMesh
                scene={scene}
                posTex={posTex}
                nrmTex={nrmTex}
                metaData={meta}
                frameRatio={0.5}
                scale={10}
                materialConfig={materialConfig}
                shaders={shaders}
                customUniforms={customUniforms}
            />
        )}
    </>);
}
