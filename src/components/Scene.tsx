import { CameraControls } from "@react-three/drei";
import { CanvasCapture } from "@packages/r3f-gist/components/utility";
import EnvironmentSetup from "./EnvironmentSetup";
import Lights from "./Lights";
import Rose from "./Rose";
import Effects from "./Effects";

export default function Scene() {


    return (
        <>
            <color attach="background" args={['#000000']} />
            <Lights />
            <EnvironmentSetup />
            {/* <fogExp2 attach="fog" args={['#000000', 0.05]} /> */}
            <Effects />

            <mesh rotation-x={-Math.PI / 2} receiveShadow>
                <planeGeometry args={[10, 10]} />
                <meshStandardMaterial color="white" />
            </mesh>

            {/* <mesh castShadow receiveShadow>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="white" />
            </mesh> */}

            <CameraControls makeDefault />

            <CanvasCapture />

            <Rose />
        </>
    )
}

