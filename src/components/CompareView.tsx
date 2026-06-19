import { useEffect, useMemo, useRef } from 'react'
import { compile } from '../compileClient'
import { useStore } from '../store'
import { TreeSvg } from './TreeSvg'
import { RuntimeSession } from '../runtime-session/RuntimeSession'
import { IframeTransport } from '../runtime-session/transport'
import { useSessionState } from '../runtime-session/react'
import baseSrc from '../../runtime/scenarios/cascade.plain.tsx?raw'
import memoSrc from '../../runtime/scenarios/cascade.memo.plain.tsx?raw'
import type { CommitFrame } from '../../shared/protocol'

const renderedCount = (f: CommitFrame | null) => (f ? f.renders.filter((r) => r.rendered).length : 0)
const noop = () => {}

// Two coordinated RuntimeSessions (memo off | memo on). All the per-runtime
// lifecycle (iframe wiring, compile→run, message→state) is the session's job now;
// Compare Mode only adds the cross-runtime concern: fan one real click to both
// apps (they render identical DOM) so a single action drives both trees.
export function CompareView() {
  const speed = useStore((s) => s.speed)
  const layers = useStore((s) => s.layers)
  const aRef = useRef<HTMLIFrameElement>(null)
  const bRef = useRef<HTMLIFrameElement>(null)
  const sessionA = useMemo(() => new RuntimeSession(compile), [])
  const sessionB = useMemo(() => new RuntimeSession(compile), [])
  const a = useSessionState(sessionA)
  const b = useSessionState(sessionB)

  useEffect(() => {
    if (!aRef.current || !bRef.current) return
    sessionA.attach(new IframeTransport(aRef.current))
    sessionB.attach(new IframeTransport(bRef.current))
    sessionA.setSource(baseSrc, { immediate: true })
    sessionB.setSource(memoSrc, { immediate: true })
    return () => {
      sessionA.dispose()
      sessionB.dispose()
    }
  }, [sessionA, sessionB])

  // Mirror one real click to the other app by structural child-index path (the
  // apps render identical DOM, so paths line up). Wired once both are ready.
  const bothReady = a.ready && b.ready
  useEffect(() => {
    if (!bothReady) return
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
      // `instanceof Node` would be false here — e.target belongs to the iframe's
      // realm, not the shell's. Use duck typing instead.
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
  }, [bothReady])

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
