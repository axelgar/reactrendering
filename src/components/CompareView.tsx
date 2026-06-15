import { useEffect, useRef, useState } from 'react'
import { isRuntimeMessage, SHELL_SOURCE, type CommitFrame, type ContextLink, type TreeNode } from '../../shared/protocol'
import { compile } from '../compileClient'
import { useStore } from '../store'
import { TreeSvg } from './TreeSvg'
import baseSrc from '../../runtime/scenarios/cascade.plain.tsx?raw'
import memoSrc from '../../runtime/scenarios/cascade.memo.plain.tsx?raw'

interface SideData {
  tree: TreeNode[]
  contextLinks: ContextLink[]
  latest: CommitFrame | null
  history: CommitFrame[]
  ready: boolean
}
const EMPTY: SideData = { tree: [], contextLinks: [], latest: null, history: [], ready: false }

const renderedCount = (f: CommitFrame | null) => (f ? f.renders.filter((r) => r.rendered).length : 0)
const noop = () => {}

// Two coordinated runtime instances (memo off | memo on). One real click in
// either app is mirrored to the other (the apps are structurally identical), so
// a single action drives both and the trees diverge side by side.
export function CompareView() {
  const speed = useStore((s) => s.speed)
  const layers = useStore((s) => s.layers)
  const aRef = useRef<HTMLIFrameElement>(null)
  const bRef = useRef<HTMLIFrameElement>(null)
  const [a, setA] = useState<SideData>(EMPTY)
  const [b, setB] = useState<SideData>(EMPTY)

  useEffect(() => {
    function handle(ev: MessageEvent) {
      const isA = ev.source === aRef.current?.contentWindow
      const isB = ev.source === bRef.current?.contentWindow
      if ((!isA && !isB) || !isRuntimeMessage(ev.data)) return
      const setData = isA ? setA : setB
      const msg = ev.data
      if (msg.kind === 'tree') setData((d) => ({ ...d, tree: msg.nodes, contextLinks: msg.contextLinks }))
      else if (msg.kind === 'commit')
        setData((d) => ({ ...d, latest: msg.frame, history: [...d.history, msg.frame].slice(-50) }))
      else if (msg.kind === 'ready') setData((d) => ({ ...d, ready: true }))
    }
    window.addEventListener('message', handle)
    return () => window.removeEventListener('message', handle)
  }, [])

  useEffect(() => {
    if (!a.ready) return
    compile(baseSrc)
      .then((code) => aRef.current?.contentWindow?.postMessage({ source: SHELL_SOURCE, kind: 'run', code }, '*'))
      .catch(noop)
  }, [a.ready])
  useEffect(() => {
    if (!b.ready) return
    compile(memoSrc)
      .then((code) => bRef.current?.contentWindow?.postMessage({ source: SHELL_SOURCE, kind: 'run', code }, '*'))
      .catch(noop)
  }, [b.ready])

  // Mirror clicks between the two apps by structural path (they render identical
  // DOM, so child-index paths line up).
  useEffect(() => {
    if (!a.ready || !b.ready) return
    const docA = aRef.current?.contentDocument
    const docB = bRef.current?.contentDocument
    if (!docA || !docB) return
    let mirroring = false
    const pathOf = (el: Node, root: Node) => {
      const p: number[] = []
      let n: Node | null = el
      while (n && n !== root && n.parentNode) {
        p.unshift(Array.prototype.indexOf.call(n.parentNode.childNodes, n))
        n = n.parentNode
      }
      return p
    }
    const elAt = (root: Node, path: number[]) => {
      let n: Node | null = root
      for (const i of path) {
        n = n?.childNodes[i] ?? null
        if (!n) return null
      }
      return n as (Node & { click?: () => void }) | null
    }
    const mk = (src: Document, dst: Document) => (e: Event) => {
      // Note: `instanceof Node` would be false here — e.target belongs to the
      // iframe's realm, not the shell's. Use duck typing instead.
      const origin = e.target as (Node & { parentNode: Node | null }) | null
      if (mirroring || !origin || !origin.parentNode) return
      const target = elAt(dst.body, pathOf(origin, src.body))
      if (target && typeof target.click === 'function') {
        mirroring = true
        try {
          target.click()
        } finally {
          mirroring = false
        }
      }
    }
    const hA = mk(docA, docB)
    const hB = mk(docB, docA)
    docA.addEventListener('click', hA, true)
    docB.addEventListener('click', hB, true)
    return () => {
      docA.removeEventListener('click', hA, true)
      docB.removeEventListener('click', hB, true)
    }
  }, [a.ready, b.ready])

  const interacted = !!a.latest && a.latest.trigger.type !== 'mount'

  return (
    <div className="compare">
      <div className="compare-banner">
        {interacted ? (
          <span>
            Same action → <strong>memo off: {renderedCount(a.latest)} re-rendered</strong> ·{' '}
            <strong className="green-word">memo on: {renderedCount(b.latest)} re-rendered</strong>
          </span>
        ) : (
          <span>Click a to-do (or any control) in either app — the same action drives both.</span>
        )}
      </div>
      <div className="compare-cols">
        <section className="compare-col">
          <div className="col-head">memo off</div>
          <div className="compare-app">
            <iframe ref={aRef} src="/runtime.html" title="memo off" className="compare-frame" sandbox="allow-scripts allow-same-origin" />
          </div>
          <div className="compare-tree">
            <TreeSvg tree={a.tree} contextLinks={a.contextLinks} latest={a.latest} history={a.history} selectedId={null} speed={speed} layers={layers} replayTick={0} onSelect={noop} onForce={noop} />
          </div>
        </section>
        <section className="compare-col">
          <div className="col-head green">memo on</div>
          <div className="compare-app">
            <iframe ref={bRef} src="/runtime.html" title="memo on" className="compare-frame" sandbox="allow-scripts allow-same-origin" />
          </div>
          <div className="compare-tree">
            <TreeSvg tree={b.tree} contextLinks={b.contextLinks} latest={b.latest} history={b.history} selectedId={null} speed={speed} layers={layers} replayTick={0} onSelect={noop} onForce={noop} />
          </div>
        </section>
      </div>
    </div>
  )
}
