import { CameraControls } from "@react-three/drei";
import { CanvasCapture } from "@packages/r3f-gist/components/utility";
import { useVATPreloader } from "./vat/VATPreloader";
import { VATMesh } from "./vat/VATMesh";
import EnvironmentSetup from "./EnvironmentSetup";
import Lights from "./Lights";

export default function Scene() {
    const { gltf, posTex, nrmTex, meta, isLoaded } = useVATPreloader(
        '/vat/Rose_fixed_basisMesh.gltf',
        '/vat/Rose_fixed_pos.exr',
        '/vat/Rose_fixed_nrm.png',
        '/vat/Rose_fixed_meta.json')

    return (
        <>
            <color attach="background" args={['#000000']} />
            <Lights />
            <EnvironmentSetup />

            <mesh rotation-x={-Math.PI / 2} receiveShadow>
                <planeGeometry args={[10, 10]} />
                <meshStandardMaterial color="white" />
            </mesh>

            <mesh castShadow position={[1, 1, 0]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="red" />
            </mesh>

            <CameraControls makeDefault />
            <CanvasCapture />
            {isLoaded && (
                <VATMesh
                    gltf={gltf.scene}
                    posTex={posTex}
                    nrmTex={nrmTex}
                    metaData={meta}
                />
            )}
        </>
    )
}

