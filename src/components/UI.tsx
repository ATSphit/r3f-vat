import { useEffect, useState } from "react"
import FullscreenLoadingOverlay from "@packages/r3f-gist/components/ui/FullscreenLoadingOverlay"
import { useLoadedFileCount } from "@packages/r3f-gist/hooks"
import { useProgress } from "@react-three/drei"

export default function UI() {
    const {progress} = useProgress()
    const {loaded: filesLoaded} = useLoadedFileCount(12)
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        if (filesLoaded) {
            const timer = setTimeout(() => setIsLoaded(true), 200)
            return () => clearTimeout(timer)
        }
    }, [filesLoaded])
    

    return <FullscreenLoadingOverlay isLoaded={isLoaded} progress={progress} />
}