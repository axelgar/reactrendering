import { useStore } from '../store'
import { scenarioById } from '../scenarios'
import type { CommitFrame } from '../../shared/protocol'

function triggerText(frame: CommitFrame): string {
  const t = frame.trigger
  if (t.type === 'mount') return 'Initial mount'
  if (t.type === 'force') return `You forced ${t.name} to re-render`
  return `You changed state in ${t.sourceName}`
}

export function WhyPanel() {
  const latest = useStore((s) => s.latest)
  const hasInteracted = useStore((s) => s.hasInteracted)
  const selectedId = useStore((s) => s.selectedId)
  const tree = useStore((s) => s.tree)
  const forceUpdate = useStore((s) => s.forceUpdate)
  const select = useStore((s) => s.select)

  const scenarioId = useStore((s) => s.scenarioId)
  const scenario = scenarioById(scenarioId)
  const introDismissed = useStore((s) => s.introDismissed)
  const dismissIntro = useStore((s) => s.dismissIntro)
  const showIntro = !introDismissed && (!hasInteracted || !latest)
  const selectedNode = tree.find((n) => n.id === selectedId) ?? null
  const selectedEvent = latest?.renders.find((r) => r.id === selectedId) ?? null

  const rendered = latest?.renders.filter((r) => r.rendered).length ?? 0
  const wasted = latest?.renders.filter((r) => r.reason.includes('wasted')).length ?? 0
  const skipped = latest?.renders.filter((r) => !r.rendered).length ?? 0
  const committedCount = latest?.committedIds.length ?? 0

  return (
    <aside className="why">
      <div className="why-scroll">
        {showIntro ? (
          <div className="why-intro">
            <button
              className="intro-dismiss"
              onClick={dismissIntro}
              title="Hide this — I know how to use it"
              aria-label="Hide the intro"
            >
              ✕
            </button>
            <p className="why-blurb">{scenario.blurb}</p>
            <p className="why-try-label">Try this</p>
            <ul className="why-experiments">
              {scenario.experiments.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
        ) : !latest ? (
          <p className="why-hint">Interact with the app to see what re-renders, and why.</p>
        ) : (
          <>
            <div className="why-summary">
              <h2>{triggerText(latest)}</h2>
              <p>
                <strong>{rendered}</strong> re-rendered{' · '}
                <strong className="committed-num">{committedCount}</strong> changed the DOM
                {skipped > 0 && (
                  <>
                    {' · '}
                    <strong className="skipped-num">{skipped}</strong> skipped
                  </>
                )}
                {wasted > 0 && (
                  <>
                    {' · '}
                    <strong className="wasted-num">{wasted}</strong> wasted
                  </>
                )}
              </p>
            </div>

            {selectedNode && (
              <div className="why-selected">
                <div className="why-selected-head">
                  <span className="sel-name">{selectedNode.name}</span>
                  <button className="link" onClick={() => select(null)}>
                    clear
                  </button>
                </div>
                {selectedEvent ? (
                  <>
                    <p className="sel-reason">{selectedEvent.reason}</p>
                    <p className="sel-meta">
                      render #{selectedEvent.renderCount}
                      {selectedEvent.propsChanged.length > 0 && (
                        <>
                          {' · changed props: '}
                          {selectedEvent.propsChanged.map((p) => (
                            <code key={p}>{p}</code>
                          ))}
                        </>
                      )}
                    </p>
                  </>
                ) : (
                  <p className="sel-reason muted">Did not re-render in the last commit.</p>
                )}
                <button className="force-btn" onClick={() => forceUpdate(selectedNode.id)}>
                  ⚡ Force this node to re-render
                </button>
              </div>
            )}

            <ol className="why-list">
              {latest.renders.map((r) => (
                <li
                  key={r.id}
                  className={`why-row${r.id === selectedId ? ' active' : ''}${
                    r.reason.includes('wasted') ? ' is-wasted' : ''
                  }${!r.rendered ? ' is-bailed' : ''}`}
                  onClick={() => select(r.id)}
                >
                  <span className="row-name">{r.name}</span>
                  <span className="row-reason">
                    {r.reason}
                    {r.committed && <span className="dom-tag">changed DOM</span>}
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
      <p className="disclosure">
        Running a tracked copy of real React — the code is genuine; we add invisible instrumentation
        to observe and poke renders.
      </p>
    </aside>
  )
}
