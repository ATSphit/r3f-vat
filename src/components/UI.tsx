import FullscreenLoadingOverlay from "@packages/r3f-gist/components/ui/FullscreenLoadingOverlay"
import { useLoadedFileCount } from "@packages/r3f-gist/hooks"
import { useProgress } from "@react-three/drei"

export default function UI() {
    const {progress} = useProgress()
    const {loaded} = useLoadedFileCount(12)
    return <FullscreenLoadingOverlay isLoaded={loaded} progress={progress} />
}