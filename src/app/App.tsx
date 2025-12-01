import { AdaptiveDpr } from "@react-three/drei";
import { LevaWrapper } from "@packages/r3f-gist/components";
import { Canvas } from "@react-three/fiber";
import Scene from "../components/Scene";
import * as THREE from 'three';
import { Suspense } from "react";
import { Preload } from "@react-three/drei";
import UI from "../components/UI";

export default function App() {
    return <>
        <LevaWrapper initialHidden={true} />
        <Canvas
            shadows
            camera={{
                fov: 45,
                near: 0.1,
                far: 10,
                position: [1, 1.5, 2]
            }}
            gl={{
                preserveDrawingBuffer: true,
                outputColorSpace: THREE.SRGBColorSpace,
            }}
            dpr={[1, 2]}
            performance={{ min: 0.5, max: 1 }}
        >
            <Suspense fallback={null}>
                <fogExp2 attach="fog" args={['#000000', 0.2]} />
                <AdaptiveDpr pixelated />
                <Scene />
                <Preload all />
            </Suspense>
        </Canvas>

        <UI />
    </>
}
