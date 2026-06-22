import { useStore, useT } from '../store'
import { useRuntimeActions, useRuntimeSession } from '../runtime-session/react'
import type { CommitFrame } from '../../shared/protocol'
import type { Dict } from '../i18n'

function triggerText(frame: CommitFrame, t: Dict): string {
  const tr = frame.trigger
  if (tr.type === 'mount') return t.why.triggerMount
  if (tr.type === 'force') return t.why.triggerForced(tr.name)
  return t.why.triggerState(tr.sourceName)
}

export function WhyPanel() {
  const t = useT()
  const { latest, tree } = useRuntimeSession()
  const { forceNode } = useRuntimeActions()
  const hasInteracted = useStore((s) => s.hasInteracted)
  const selectedId = useStore((s) => s.selectedId)
  const select = useStore((s) => s.select)

  const scenarioId = useStore((s) => s.scenarioId)
  const scenarioText = t.scenarios[scenarioId]
  const introDismissed = useStore((s) => s.introDismissed)
  const dismissIntro = useStore((s) => s.dismissIntro)
  const showIntro = !introDismissed && (!hasInteracted || !latest)
  const selectedNode = tree.find((n) => n.id === selectedId) ?? null
  const selectedEvent = latest?.renders.find((r) => r.id === selectedId) ?? null

  const rendered = latest?.renders.filter((r) => r.rendered).length ?? 0
  const wasted = latest?.renders.filter((r) => r.reasonCode === 'wasted').length ?? 0
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
              title={t.why.hideIntroTitle}
              aria-label={t.why.hideIntroAria}
            >
              ✕
            </button>
            <p className="why-blurb">{scenarioText.blurb}</p>
            <p className="why-try-label">{t.why.tryThis}</p>
            <ul className="why-experiments">
              {scenarioText.experiments.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
        ) : !latest ? (
          <p className="why-hint">{t.why.interactHint}</p>
        ) : (
          <>
            <div className="why-summary">
              <h2>{triggerText(latest, t)}</h2>
              <p>
                <strong>{rendered}</strong> {t.why.rerendered}{' · '}
                <strong className="committed-num">{committedCount}</strong> {t.why.changedDom}
                {skipped > 0 && (
                  <>
                    {' · '}
                    <strong className="skipped-num">{skipped}</strong> {t.why.skipped}
                  </>
                )}
                {wasted > 0 && (
                  <>
                    {' · '}
                    <strong className="wasted-num">{wasted}</strong> {t.why.wasted}
                  </>
                )}
              </p>
            </div>

            {selectedNode && (
              <div className="why-selected" key={selectedNode.id}>
                <div className="why-selected-head">
                  <span className="sel-name">{selectedNode.name}</span>
                  <button className="link" onClick={() => select(null)}>
                    {t.why.clear}
                  </button>
                </div>
                {selectedEvent ? (
                  <>
                    <p className="sel-reason">{t.reason(selectedEvent.reasonCode, selectedEvent.propsChanged)}</p>
                    <p className="sel-meta">
                      {t.why.renderNum(selectedEvent.renderCount)}
                      {selectedEvent.propsChanged.length > 0 && (
                        <>
                          {' · '}
                          {t.why.changedProps}
                          {selectedEvent.propsChanged.map((p) => (
                            <code key={p}>{p}</code>
                          ))}
                        </>
                      )}
                    </p>
                  </>
                ) : (
                  <p className="sel-reason muted">{t.why.notRerendered}</p>
                )}
                <button className="force-btn" onClick={() => forceNode(selectedNode.id)}>
                  {t.why.forceNode}
                </button>
              </div>
            )}

            <ol className="why-list">
              {latest.renders.map((r) => (
                <li
                  key={r.id}
                  className={`why-row${r.id === selectedId ? ' active' : ''}${
                    r.reasonCode === 'wasted' ? ' is-wasted' : ''
                  }${!r.rendered ? ' is-bailed' : ''}`}
                  onClick={() => select(r.id)}
                >
                  <span className="row-name">{r.name}</span>
                  <span className="row-reason">
                    {t.reason(r.reasonCode, r.propsChanged)}
                    {r.committed && <span className="dom-tag">{t.why.changedDomTag}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
      <p className="disclosure">{t.why.disclosure}</p>
    </aside>
  )
}
