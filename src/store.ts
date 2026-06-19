import { create } from 'zustand'
import type { NodeId } from '../shared/protocol'
import { DEFAULT_SCENARIO, scenarioById } from './scenarios'

export type Speed = 'instant' | 'slow'

// The global store holds VIEW + EDIT intent only. Per-runtime render-log data
// (tree, commits, errors, ready) lives in a RuntimeSession's SessionState —
// see src/runtime-session. The store never touches the wire.
interface RRState {
  selectedId: NodeId | null
  speed: Speed
  layers: { props: boolean; context: boolean }
  replayTick: number
  hasInteracted: boolean
  source: string
  sourceEpoch: number
  scenarioId: string
  variantId: string | null
  editorOpen: boolean
  compareOn: boolean
  introDismissed: boolean

  setSource: (source: string) => void
  setScenario: (id: string) => void
  setVariant: (variantId: string | null) => void
  toggleEditor: () => void
  toggleCompare: () => void
  dismissIntro: () => void

  select: (id: NodeId | null) => void
  setSpeed: (s: Speed) => void
  toggleLayer: (layer: 'props' | 'context') => void
  replay: () => void

  // set by the single-mode bridge when the active session reports interaction
  markInteracted: () => void
  // view-state half of a reset (the session clears its own render log)
  resetView: () => void
}

const readIntroDismissed = () => {
  try {
    return localStorage.getItem('rr-intro-dismissed') === '1'
  } catch {
    return false
  }
}

export const useStore = create<RRState>((set) => ({
  selectedId: null,
  speed: 'slow',
  layers: { props: false, context: false },
  replayTick: 0,
  hasInteracted: false,
  source: scenarioById(DEFAULT_SCENARIO).source,
  sourceEpoch: 0,
  scenarioId: DEFAULT_SCENARIO,
  variantId: null,
  editorOpen: false,
  compareOn: false,
  introDismissed: readIntroDismissed(),

  setSource: (source) => set({ source }),
  setScenario: (id) =>
    set((s) => {
      if (id === s.scenarioId) return s
      const sc = scenarioById(id)
      return {
        scenarioId: id,
        variantId: null,
        source: sc.source,
        sourceEpoch: s.sourceEpoch + 1, // signals the editor + session to load this source
        selectedId: null,
      }
    }),
  setVariant: (variantId) =>
    set((s) => {
      if (variantId === s.variantId) return s
      const sc = scenarioById(s.scenarioId)
      const src = variantId ? (sc.variants.find((v) => v.id === variantId)?.source ?? sc.source) : sc.source
      return {
        variantId,
        source: src,
        sourceEpoch: s.sourceEpoch + 1,
        selectedId: null,
      }
    }),
  toggleEditor: () => set((s) => ({ editorOpen: !s.editorOpen })),
  toggleCompare: () => set((s) => ({ compareOn: !s.compareOn })),
  dismissIntro: () => {
    try {
      localStorage.setItem('rr-intro-dismissed', '1')
    } catch {
      /* ignore */
    }
    set({ introDismissed: true })
  },

  select: (id) => set({ selectedId: id }),
  setSpeed: (s) => set({ speed: s }),
  toggleLayer: (layer) => set((s) => ({ layers: { ...s.layers, [layer]: !s.layers[layer] } })),
  replay: () => set((s) => ({ replayTick: s.replayTick + 1 })),

  markInteracted: () => set((s) => (s.hasInteracted ? s : { hasInteracted: true })),
  resetView: () => set({ selectedId: null, hasInteracted: false }),
}))

// Dev-only handle for debugging / automated verification.
if (import.meta.env.DEV) {
  ;(window as unknown as { __rrStore?: typeof useStore }).__rrStore = useStore
}
