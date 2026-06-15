import { TreeSvg } from './TreeSvg'
import { useStore } from '../store'

// Store-connected tree (single-instance mode). The presentational SVG lives in
// TreeSvg so compare mode can render two of them with independent data.
export function TreeView() {
  const tree = useStore((s) => s.tree)
  const contextLinks = useStore((s) => s.contextLinks)
  const latest = useStore((s) => s.latest)
  const history = useStore((s) => s.history)
  const selectedId = useStore((s) => s.selectedId)
  const speed = useStore((s) => s.speed)
  const layers = useStore((s) => s.layers)
  const replayTick = useStore((s) => s.replayTick)
  const select = useStore((s) => s.select)
  const forceUpdate = useStore((s) => s.forceUpdate)

  return (
    <TreeSvg
      tree={tree}
      contextLinks={contextLinks}
      latest={latest}
      history={history}
      selectedId={selectedId}
      speed={speed}
      layers={layers}
      replayTick={replayTick}
      onSelect={select}
      onForce={forceUpdate}
    />
  )
}
