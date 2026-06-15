import { LiveAppFrame } from './components/LiveAppFrame'
import { TreeView } from './components/TreeView'
import { WhyPanel } from './components/WhyPanel'
import { Toolbar } from './components/Toolbar'
import { CoachMark } from './components/CoachMark'
import { Editor } from './components/Editor'
import { CompareView } from './components/CompareView'
import { useStore } from './store'

export function App() {
  const status = useStore((s) => s.status)
  const error = useStore((s) => s.error)
  const editorOpen = useStore((s) => s.editorOpen)
  const compareOn = useStore((s) => s.compareOn)

  return (
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

      {error?.phase === 'compile' && (
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
        <main className="panes">
          <section className="pane pane-app">
            <div className="pane-head">Live app</div>
            <div className="pane-body">
              <LiveAppFrame />
              <CoachMark />
            </div>
          </section>

          <section className="pane pane-tree">
            <div className="pane-head">Component tree</div>
            <div className="pane-body">
              <TreeView />
            </div>
          </section>

          <section className="pane pane-why">
            <div className="pane-head">Why</div>
            <div className="pane-body">
              <WhyPanel />
            </div>
          </section>
        </main>
      )}

      {editorOpen && (
        <section className="editor-drawer">
          <div className="pane-head">
            Code · <span className="ed-hint">edits run live (your real React, instrumented)</span>
          </div>
          <Editor />
        </section>
      )}
    </div>
  )
}
