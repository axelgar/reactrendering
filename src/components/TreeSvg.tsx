import { useMemo } from 'react'
import { stratify, tree as d3tree, type HierarchyNode } from 'd3-hierarchy'
import type { CommitFrame, ContextLink, NodeId, RenderEvent, TreeNode } from '../../shared/protocol'
import type { Speed } from '../store'

const NW = 116
const NH = 38
const DX = 136 // sibling spacing
const DY = 98 // level spacing
const PAD = 48

function linkPath(s: { x: number; y: number }, t: { x: number; y: number }) {
  const sy = s.y + NH / 2
  const ty = t.y - NH / 2
  const my = (sy + ty) / 2
  return `M${s.x},${sy} C${s.x},${my} ${t.x},${my} ${t.x},${ty}`
}

// Context edges connect arbitrary nodes (provider → consumer, often skipping
// levels), so bow them out to the side to read as "going around" the tree.
function contextPath(s: { x: number; y: number }, t: { x: number; y: number }) {
  const sy = s.y + NH / 2
  const ty = t.y - NH / 2
  const mx = (s.x + t.x) / 2 + 70
  const my = (sy + ty) / 2
  return `M${s.x},${sy} Q${mx},${my} ${t.x},${ty}`
}

export interface TreeSvgProps {
  tree: TreeNode[]
  contextLinks: ContextLink[]
  latest: CommitFrame | null
  history: CommitFrame[]
  selectedId: NodeId | null
  speed: Speed
  layers: { props: boolean; context: boolean }
  replayTick: number
  onSelect: (id: NodeId) => void
  onForce: (id: NodeId) => void
}

export function TreeSvg({
  tree,
  contextLinks,
  latest,
  history,
  selectedId,
  speed,
  layers,
  replayTick,
  onSelect,
  onForce,
}: TreeSvgProps) {
  const layout = useMemo(() => {
    if (tree.length === 0) return null
    try {
      const root = stratify<TreeNode>()
        .id((d) => d.id)
        .parentId((d) => d.parentId)(tree)
      d3tree<TreeNode>().nodeSize([DX, DY])(root)
      return root as HierarchyNode<TreeNode> & { x: number; y: number }
    } catch {
      return null
    }
  }, [tree])

  const counts = useMemo(() => {
    const m = new Map<NodeId, number>()
    for (const f of history) for (const r of f.renders) m.set(r.id, Math.max(m.get(r.id) ?? 0, r.renderCount))
    return m
  }, [history])

  const events = useMemo(() => {
    const m = new Map<NodeId, RenderEvent>()
    if (latest) for (const r of latest.renders) m.set(r.id, r)
    return m
  }, [latest])

  const committed = useMemo(() => new Set<NodeId>(latest?.committedIds ?? []), [latest])

  const propsChangedIds = useMemo(() => {
    const s = new Set<NodeId>()
    if (latest) for (const r of latest.renders) if (r.rendered && r.propsChanged.length > 0) s.add(r.id)
    return s
  }, [latest])

  if (!layout) {
    return (
      <div className="tree-empty">
        <p>Waiting for the live app…</p>
      </div>
    )
  }

  const nodes = layout.descendants() as Array<HierarchyNode<TreeNode> & { x: number; y: number }>
  const links = layout.links() as Array<{
    source: { x: number; y: number; data: TreeNode }
    target: { x: number; y: number; data: TreeNode }
  }>
  const pos = new Map<NodeId, { x: number; y: number }>()
  for (const n of nodes) pos.set(n.data.id, { x: n.x, y: n.y })

  const xs = nodes.map((n) => n.x)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const maxDepth = Math.max(...nodes.map((n) => n.depth))
  const width = maxX - minX + NW + PAD * 2
  const height = maxDepth * DY + NH + PAD * 2
  const viewBox = `${minX - NW / 2 - PAD} ${-NH / 2 - PAD} ${width} ${height}`

  const sourceId =
    latest?.trigger.type === 'state' ? latest.trigger.sourceId : latest?.trigger.type === 'force' ? latest.trigger.id : null

  return (
    <svg
      className="tree-svg"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-label="Component tree — focus a node and press Enter to inspect it"
    >
      <g className="edges">
        {links.map((l, i) => {
          const t = l.target.data
          let cls = 'edge-own'
          if (layers.props && (t.propKeys?.length ?? 0) > 0) {
            // structural props-flow edge; emphasize when props actually changed
            cls = propsChangedIds.has(t.id) ? 'edge-props changed' : 'edge-props'
          }
          return <path key={i} className={`edge ${cls}`} d={linkPath(l.source, l.target)} />
        })}
      </g>
      {layers.context && contextLinks.length > 0 && (
        <g className="context-edges">
          {contextLinks.map((cl, i) => {
            const p = pos.get(cl.providerId)
            const c = pos.get(cl.consumerId)
            if (!p || !c) return null
            return <path key={i} className="edge edge-context" d={contextPath(p, c)} />
          })}
        </g>
      )}
      <g className="nodes">
        {nodes.map((n) => {
          const ev = events.get(n.data.id)
          const isSource = n.data.id === sourceId
          const isSelected = n.data.id === selectedId
          const didCommit = committed.has(n.data.id)
          const count = counts.get(n.data.id)
          const delay = speed === 'slow' && ev ? ev.order * 200 : 0
          const stateLabel = ev
            ? ev.rendered
              ? `re-rendered${didCommit ? ', changed the DOM' : ''}`
              : 'skipped this commit'
            : ''
          const ariaLabel = `${n.data.name}${count != null ? `, ${count} render${count === 1 ? '' : 's'}` : ''}${
            stateLabel ? `, ${stateLabel}` : ''
          }`
          return (
            <g
              key={n.data.id}
              className="node"
              transform={`translate(${n.x},${n.y})`}
              role="button"
              tabIndex={0}
              aria-label={ariaLabel}
              onClick={() => onSelect(n.data.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(n.data.id)
                }
              }}
            >
              {ev?.rendered && (
                <rect
                  key={`flash-${n.data.id}-${latest?.seq}-${replayTick}`}
                  className="flash"
                  x={-NW / 2 - 4}
                  y={-NH / 2 - 4}
                  width={NW + 8}
                  height={NH + 8}
                  rx={11}
                  style={{ animationDelay: `${delay}ms` }}
                />
              )}
              {didCommit && (
                <rect
                  key={`commit-${n.data.id}-${latest?.seq}-${replayTick}`}
                  className="flash-commit"
                  x={-NW / 2 - 2}
                  y={-NH / 2 - 2}
                  width={NW + 4}
                  height={NH + 4}
                  rx={10}
                  style={{ animationDelay: `${delay + 150}ms` }}
                />
              )}
              <rect
                className={`box${isSelected ? ' selected' : ''}${isSource ? ' source' : ''}${didCommit ? ' committed' : ''}${
                  ev && !ev.rendered ? ' bailed' : ''
                }`}
                x={-NW / 2}
                y={-NH / 2}
                width={NW}
                height={NH}
                rx={9}
              />
              <text className="label" textAnchor="middle" dominantBaseline="central">
                {n.data.name}
              </text>
              {count != null && (
                <g className="count" transform={`translate(${NW / 2 - 2},${-NH / 2 + 2})`}>
                  <circle r={9} />
                  <text textAnchor="middle" dominantBaseline="central">
                    {count}
                  </text>
                </g>
              )}
              <g
                className="zap"
                transform={`translate(${-NW / 2 + 2},${-NH / 2 + 2})`}
                onClick={(e) => {
                  e.stopPropagation()
                  onForce(n.data.id)
                }}
              >
                <title>Force this component to re-render</title>
                <circle r={9} />
                <text textAnchor="middle" dominantBaseline="central">
                  ⚡
                </text>
              </g>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
