import { TreeSvg } from './TreeSvg'
import { useStore } from '../store'
import { useRuntimeActions, useRuntimeSession } from '../runtime-session/react'

// Store-connected tree (single-instance mode). Render-log facts come from the
// active RuntimeSession; view state (selection, speed, layers, replay) from the
// store. The presentational TreeSvg is unchanged — Compare Mode renders two of it
// bound to two sessions.
export function TreeView() {
  const { tree, contextLinks, latest, history } = useRuntimeSession()
  const selectedId = useStore((s) => s.selectedId)
  const speed = useStore((s) => s.speed)
  const layers = useStore((s) => s.layers)
  const replayTick = useStore((s) => s.replayTick)
  const select = useStore((s) => s.select)
  const { forceNode } = useRuntimeActions()

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
      onForce={forceNode}
    />
  )
}
