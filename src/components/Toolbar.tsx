import { SCENARIOS, scenarioById } from '../scenarios'
import { useStore, useT } from '../store'
import { LANGS, type Lang } from '../i18n'
import { useRuntimeActions, useRuntimeSession } from '../runtime-session/react'

export function Toolbar() {
  const t = useT()
  const lang = useStore((s) => s.lang)
  const setLang = useStore((s) => s.setLang)
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
  const scenarioText = t.scenarios[scenarioId]
  const canCompare = scenarioId === 'cascade'

  return (
    <div className="toolbar-bar">
      <div className="tb-group">
        <label className="tb-label">{t.toolbar.scenario}</label>
        <select className="tb-select" value={scenarioId} onChange={(e) => setScenario(e.target.value)} disabled={compareOn}>
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>
              {t.scenarios[s.id].label}
            </option>
          ))}
        </select>
      </div>

      <div className="tb-group">
        <button className={editorOpen ? 'tb-btn on' : 'tb-btn'} onClick={toggleEditor}>
          {editorOpen ? t.toolbar.hideCode : t.toolbar.editCode}
        </button>
      </div>

      {scenario.variants.length > 0 && (
        <div className="tb-group">
          <label className="tb-label">{t.toolbar.whatIf}</label>
          {scenario.variants.map((v) => {
            const label = scenarioText.variants[v.id] ?? v.id
            return (
              <button
                key={v.id}
                className={variantId === v.id ? 'memo-toggle on' : 'memo-toggle'}
                onClick={() => setVariant(variantId === v.id ? null : v.id)}
                disabled={compareOn}
                title={t.toolbar.swapTo(label)}
              >
                <span className="dot-toggle" /> {label} {variantId === v.id ? t.toolbar.on : t.toolbar.off}
              </button>
            )
          })}
        </div>
      )}

      {canCompare && (
        <div className="tb-group">
          <button
            className={compareOn ? 'tb-btn on' : 'tb-btn'}
            onClick={toggleCompare}
            title={t.toolbar.compareTitle}
          >
            {compareOn ? t.toolbar.closeCompare : t.toolbar.compare}
          </button>
        </div>
      )}

      <div className="tb-spacer" />

      <div className="tb-group">
        <label className="tb-label">{t.toolbar.layers}</label>
        <span className="layer-chip active">{t.toolbar.ownership}</span>
        <button
          className={`layer-chip props${layers.props ? ' on' : ''}`}
          onClick={() => toggleLayer('props')}
          title={t.toolbar.propsTitle}
        >
          {t.toolbar.props}
        </button>
        <button
          className={`layer-chip context${layers.context ? ' on' : ''}`}
          onClick={() => toggleLayer('context')}
          title={t.toolbar.contextTitle}
        >
          {t.toolbar.context}
        </button>
      </div>

      <div className="tb-group">
        <label className="tb-label">{t.toolbar.replay}</label>
        <div className="segmented">
          <button className={speed === 'instant' ? 'on' : ''} onClick={() => setSpeed('instant')}>
            {t.toolbar.instant}
          </button>
          <button className={speed === 'slow' ? 'on' : ''} onClick={() => setSpeed('slow')}>
            {t.toolbar.slow}
          </button>
        </div>
        <button className="tb-btn" onClick={replay} disabled={!hasLatest}>
          {/* key remount replays the one-shot spin each time replayTick advances */}
          <span className={replayTick > 0 ? 'rr-replay rr-spin' : 'rr-replay'} key={replayTick} aria-hidden="true">
            ↻
          </span>{' '}
          {t.toolbar.replayBtn}
        </button>
        <button className="tb-btn" onClick={reset}>
          {t.toolbar.reset}
        </button>
      </div>

      <div className="tb-group">
        <label className="tb-label">{t.language}</label>
        <select className="tb-select" value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label={t.language}>
          {LANGS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
