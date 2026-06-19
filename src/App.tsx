import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { RuntimeFrame } from './components/RuntimeFrame'
import { TreeView } from './components/TreeView'
import { WhyPanel } from './components/WhyPanel'
import { Toolbar } from './components/Toolbar'
import { CoachMark } from './components/CoachMark'
import { Editor } from './components/Editor'
import { CompareView } from './components/CompareView'
import { ResizeHandle } from './components/ResizeHandle'
import { useStore } from './store'
import { compile } from './compileClient'
import { RuntimeSession } from './runtime-session/RuntimeSession'
import { RuntimeSessionProvider, useSessionState } from './runtime-session/react'
import { deriveStatus } from './runtime-session/reduce'

// Panel-size bounds. The two side columns are draggable; the tree (middle)
// flexes, and MID_MIN keeps it from being squeezed away.
const APP_DEFAULT = 300
const WHY_DEFAULT = 340
const APP_MIN = 240
const APP_MAX = 460
const WHY_MIN = 280
const WHY_MAX = 560
const MID_MIN = 220
const GAPS = 24 // two 12px grid gaps
const EDITOR_MIN = 200
const STEP = 24 // keyboard nudge

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

function readNum(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(key)
    if (v == null) return fallback
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  } catch {
    return fallback
  }
}

function persist(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    /* ignore */
  }
}

export function App() {
  const editorOpen = useStore((s) => s.editorOpen)
  const compareOn = useStore((s) => s.compareOn)
  const source = useStore((s) => s.source)
  const sourceEpoch = useStore((s) => s.sourceEpoch)

  // The single-mode runtime session owns the iframe lifecycle + render-log state.
  const session = useMemo(() => new RuntimeSession(compile), [])
  const sessionState = useSessionState(session)
  const status = deriveStatus(sessionState)
  const error = sessionState.error
  const prevEpoch = useRef(sourceEpoch)

  // Bridge: feed authored source to the session (debounced edit, immediate swap),
  // and lift the session's interaction signal back into view state.
  useEffect(() => {
    const swapped = prevEpoch.current !== sourceEpoch
    prevEpoch.current = sourceEpoch
    if (swapped) {
      session.clear()
      session.setSource(source, { immediate: true })
    } else {
      session.setSource(source)
    }
  }, [source, sourceEpoch, session])
  useEffect(
    () =>
      session.subscribe(() => {
        const st = session.getState()
        if (st.latest && st.latest.trigger.type !== 'mount') useStore.getState().markInteracted()
      }),
    [session],
  )
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __rrSession?: RuntimeSession }).__rrSession = session
  }, [session])

  const panesRef = useRef<HTMLElement>(null)
  const drawerRef = useRef<HTMLElement>(null)
  // Live values during a drag — avoids a React render per pointer move.
  const drag = useRef({ startApp: 0, startWhy: 0, startH: 0, app: 0, why: 0, h: 0 })

  const [colApp, setColApp] = useState(() => clamp(readNum('rr-col-app', APP_DEFAULT), APP_MIN, APP_MAX))
  const [colWhy, setColWhy] = useState(() => clamp(readNum('rr-col-why', WHY_DEFAULT), WHY_MIN, WHY_MAX))
  const [editorH, setEditorH] = useState<number | null>(() => {
    const v = readNum('rr-editor-h', 0)
    return v >= EDITOR_MIN ? v : null
  })

  // Upper bounds depend on the live container width so neither side can starve
  // the tree in the middle.
  const appUpper = () => {
    const w = panesRef.current?.offsetWidth ?? Infinity
    return Math.max(APP_MIN, Math.min(APP_MAX, w - colWhy - GAPS - MID_MIN))
  }
  const whyUpper = () => {
    const w = panesRef.current?.offsetWidth ?? Infinity
    return Math.max(WHY_MIN, Math.min(WHY_MAX, w - colApp - GAPS - MID_MIN))
  }
  const editorUpper = () => Math.round(window.innerHeight * 0.8)

  const commitApp = (n: number) => {
    setColApp(n)
    persist('rr-col-app', n)
  }
  const commitWhy = (n: number) => {
    setColWhy(n)
    persist('rr-col-why', n)
  }
  const commitEditor = (n: number) => {
    setEditorH(n)
    persist('rr-editor-h', n)
  }

  return (
    <RuntimeSessionProvider value={session}>
      <div className="shell">
      <header className="masthead">
        <div className="brand">
          <h1>How React Renders</h1>
          <p>See exactly when components re-render — and why.</p>
        </div>
        <div className={`status status-${status}`}>
          <span className="dot" />
          {status === 'ready' ? 'live' : status === 'error' ? 'error' : 'connecting…'}
        </div>
      </header>

      <Toolbar />

      {!compareOn && error?.phase === 'compile' && (
        <div className="compile-error">
          <span className="ce-tag">won’t compile</span>
          <span className="ce-msg">{error.message}</span>
        </div>
      )}

      {compareOn ? (
        <main className="panes panes-compare">
          <CompareView />
        </main>
      ) : (
        <main
          className="panes"
          ref={panesRef}
          style={{ '--col-app': `${colApp}px`, '--col-why': `${colWhy}px` } as CSSProperties}
        >
          <section className="pane pane-app">
            <div className="pane-head">Live app</div>
            <div className="pane-body">
              <RuntimeFrame session={session} />
              <CoachMark />
            </div>
          </section>

          <ResizeHandle
            className="col-resizer"
            orientation="vertical"
            ariaLabel="Resize the live-app panel"
            style={{ left: 'calc(var(--col-app) + 6px)' }}
            onStart={() => {
              drag.current.startApp = colApp
              drag.current.app = colApp
            }}
            onDrag={(d) => {
              const next = clamp(drag.current.startApp + d, APP_MIN, appUpper())
              drag.current.app = next
              panesRef.current?.style.setProperty('--col-app', `${next}px`)
            }}
            onEnd={() => commitApp(drag.current.app)}
            onStep={(dir) => commitApp(clamp(colApp + dir * STEP, APP_MIN, appUpper()))}
            onReset={() => commitApp(APP_DEFAULT)}
          />

          <section className="pane pane-tree">
            <div className="pane-head">Component tree</div>
            <div className="pane-body">
              <TreeView />
            </div>
          </section>

          <ResizeHandle
            className="col-resizer"
            orientation="vertical"
            ariaLabel="Resize the why panel"
            style={{ left: 'calc(100% - var(--col-why) - 6px)' }}
            onStart={() => {
              drag.current.startWhy = colWhy
              drag.current.why = colWhy
            }}
            onDrag={(d) => {
              const next = clamp(drag.current.startWhy - d, WHY_MIN, whyUpper())
              drag.current.why = next
              panesRef.current?.style.setProperty('--col-why', `${next}px`)
            }}
            onEnd={() => commitWhy(drag.current.why)}
            onStep={(dir) => commitWhy(clamp(colWhy - dir * STEP, WHY_MIN, whyUpper()))}
            onReset={() => commitWhy(WHY_DEFAULT)}
          />

          <section className="pane pane-why">
            <div className="pane-head">Why</div>
            <div className="pane-body">
              <WhyPanel />
            </div>
          </section>
        </main>
      )}

      {editorOpen && (
        <section className="editor-drawer" ref={drawerRef} style={editorH != null ? { height: `${editorH}px` } : undefined}>
          <ResizeHandle
            className="row-resizer"
            orientation="horizontal"
            ariaLabel="Resize the code editor"
            onStart={() => {
              drag.current.startH = drawerRef.current?.offsetHeight ?? 0
              drag.current.h = drag.current.startH
            }}
            onDrag={(d) => {
              // Handle sits at the drawer's top edge: dragging up (d < 0) grows it.
              const next = clamp(drag.current.startH - d, EDITOR_MIN, editorUpper())
              if (drawerRef.current) drawerRef.current.style.height = `${next}px`
              drag.current.h = next
            }}
            onEnd={() => commitEditor(drag.current.h)}
            onStep={(dir) => {
              const cur = editorH ?? drawerRef.current?.offsetHeight ?? 0
              commitEditor(clamp(cur - dir * STEP, EDITOR_MIN, editorUpper()))
            }}
            onReset={() => {
              setEditorH(null)
              try {
                localStorage.removeItem('rr-editor-h')
              } catch {
                /* ignore */
              }
            }}
          />
          <div className="pane-head">
            Code · <span className="ed-hint">edits run live (your real React, instrumented)</span>
          </div>
          <Editor />
        </section>
      )}
      </div>
    </RuntimeSessionProvider>
  )
}
