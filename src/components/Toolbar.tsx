import { SCENARIOS, scenarioById } from '../scenarios'
import { useStore } from '../store'
import { useRuntimeActions, useRuntimeSession } from '../runtime-session/react'

export function Toolbar() {
  const speed = useStore((s) => s.speed)
  const setSpeed = useStore((s) => s.setSpeed)
  const replay = useStore((s) => s.replay)
  const { reset } = useRuntimeActions()
  const hasLatest = useRuntimeSession().latest !== null
  const editorOpen = useStore((s) => s.editorOpen)
  const toggleEditor = useStore((s) => s.toggleEditor)
  const scenarioId = useStore((s) => s.scenarioId)
  const setScenario = useStore((s) => s.setScenario)
  const variantId = useStore((s) => s.variantId)
  const setVariant = useStore((s) => s.setVariant)
  const compareOn = useStore((s) => s.compareOn)
  const toggleCompare = useStore((s) => s.toggleCompare)
  const layers = useStore((s) => s.layers)
  const toggleLayer = useStore((s) => s.toggleLayer)
  const replayTick = useStore((s) => s.replayTick)

  const scenario = scenarioById(scenarioId)
  const canCompare = scenarioId === 'cascade'

  return (
    <div className="toolbar-bar">
      <div className="tb-group">
        <label className="tb-label">Scenario</label>
        <select className="tb-select" value={scenarioId} onChange={(e) => setScenario(e.target.value)} disabled={compareOn}>
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="tb-group">
        <button className={editorOpen ? 'tb-btn on' : 'tb-btn'} onClick={toggleEditor}>
          {editorOpen ? '✕ Hide code' : '‹ › Edit code'}
        </button>
      </div>

      {scenario.variants.length > 0 && (
        <div className="tb-group">
          <label className="tb-label">What-if</label>
          {scenario.variants.map((v) => (
            <button
              key={v.id}
              className={variantId === v.id ? 'memo-toggle on' : 'memo-toggle'}
              onClick={() => setVariant(variantId === v.id ? null : v.id)}
              disabled={compareOn}
              title={`Swap to the ${v.label} version of this scenario`}
            >
              <span className="dot-toggle" /> {v.label} {variantId === v.id ? 'on' : 'off'}
            </button>
          ))}
        </div>
      )}

      {canCompare && (
        <div className="tb-group">
          <button
            className={compareOn ? 'tb-btn on' : 'tb-btn'}
            onClick={toggleCompare}
            title="Run memo off and memo on side by side; one action drives both"
          >
            {compareOn ? '✕ Close compare' : '⇆ Compare'}
          </button>
        </div>
      )}

      <div className="tb-spacer" />

      <div className="tb-group">
        <label className="tb-label">Layers</label>
        <span className="layer-chip active">ownership</span>
        <button
          className={`layer-chip props${layers.props ? ' on' : ''}`}
          onClick={() => toggleLayer('props')}
          title="Highlight edges where a child received changed props"
        >
          props
        </button>
        <button
          className={`layer-chip context${layers.context ? ' on' : ''}`}
          onClick={() => toggleLayer('context')}
          title="Draw context reach: provider → consumers, even past memoized middles"
        >
          context
        </button>
      </div>

      <div className="tb-group">
        <label className="tb-label">Replay</label>
        <div className="segmented">
          <button className={speed === 'instant' ? 'on' : ''} onClick={() => setSpeed('instant')}>
            instant
          </button>
          <button className={speed === 'slow' ? 'on' : ''} onClick={() => setSpeed('slow')}>
            slow
          </button>
        </div>
        <button className="tb-btn" onClick={replay} disabled={!hasLatest}>
          {/* key remount replays the one-shot spin each time replayTick advances */}
          <span className={replayTick > 0 ? 'rr-replay rr-spin' : 'rr-replay'} key={replayTick} aria-hidden="true">
            ↻
          </span>{' '}
          replay
        </button>
        <button className="tb-btn" onClick={reset}>
          reset
        </button>
      </div>
    </div>
  )
}
