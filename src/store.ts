import { create } from 'zustand'
import {
  SHELL_SOURCE,
  type CommitFrame,
  type ContextLink,
  type NodeId,
  type ShellMessage,
  type TreeNode,
} from '../shared/protocol'
import { DEFAULT_SCENARIO, scenarioById } from './scenarios'

export type Speed = 'instant' | 'slow'
export type Status = 'connecting' | 'ready' | 'error'
export interface RunError {
  phase: 'compile' | 'runtime'
  message: string
}

interface RRState {
  status: Status
  iframeReady: boolean
  error: RunError | null
  tree: TreeNode[]
  contextLinks: ContextLink[]
  latest: CommitFrame | null
  history: CommitFrame[]
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
  post: ((msg: ShellMessage) => void) | null

  // wiring
  setPost: (fn: (msg: ShellMessage) => void) => void
  onReady: () => void
  onRuntimeError: (message: string) => void
  onTree: (nodes: TreeNode[], contextLinks: ContextLink[]) => void
  onCommit: (frame: CommitFrame) => void

  // editor / compile
  setSource: (source: string) => void
  setScenario: (id: string) => void
  setVariant: (variantId: string | null) => void
  setCompileError: (message: string | null) => void
  toggleEditor: () => void
  toggleCompare: () => void
  dismissIntro: () => void

  // user actions
  select: (id: NodeId | null) => void
  forceUpdate: (id: NodeId) => void
  setSpeed: (s: Speed) => void
  toggleLayer: (layer: 'props' | 'context') => void
  replay: () => void
  reset: () => void
}

const readIntroDismissed = () => {
  try {
    return localStorage.getItem('rr-intro-dismissed') === '1'
  } catch {
    return false
  }
}

export const useStore = create<RRState>((set, get) => ({
  status: 'connecting',
  iframeReady: false,
  error: null,
  tree: [],
  contextLinks: [],
  latest: null,
  history: [],
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
  post: null,

  setPost: (fn) => set({ post: fn }),
  onReady: () => set({ iframeReady: true, status: 'ready' }),
  onRuntimeError: (message) => set({ status: 'error', error: { phase: 'runtime', message } }),
  onTree: (nodes, contextLinks) => set({ tree: nodes, contextLinks }),
  onCommit: (frame) =>
    set((s) => ({
      latest: frame,
      history: [...s.history, frame].slice(-50),
      status: 'ready',
      // A fresh commit means the current code runs — clear any prior error.
      error: s.error?.phase === 'runtime' ? null : s.error,
      hasInteracted: s.hasInteracted || frame.trigger.type !== 'mount',
    })),

  setSource: (source) => set({ source }),
  setScenario: (id) =>
    set((s) => {
      if (id === s.scenarioId) return s
      const sc = scenarioById(id)
      return {
        scenarioId: id,
        variantId: null,
        source: sc.source,
        sourceEpoch: s.sourceEpoch + 1, // signals the editor to load this source
        selectedId: null,
        tree: [],
        contextLinks: [],
        latest: null,
        history: [],
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
        tree: [],
        contextLinks: [],
        latest: null,
        history: [],
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
  setCompileError: (message) =>
    set((s) => {
      if (message) return { status: 'error', error: { phase: 'compile', message } }
      // clearing a compile error
      return { error: s.error?.phase === 'compile' ? null : s.error, status: s.iframeReady ? 'ready' : s.status }
    }),

  select: (id) => set({ selectedId: id }),
  forceUpdate: (id) => {
    get().post?.({ source: SHELL_SOURCE, kind: 'forceUpdate', id })
  },
  setSpeed: (s) => set({ speed: s }),
  toggleLayer: (layer) => set((s) => ({ layers: { ...s.layers, [layer]: !s.layers[layer] } })),
  replay: () => set((s) => ({ replayTick: s.replayTick + 1 })),
  reset: () => {
    get().post?.({ source: SHELL_SOURCE, kind: 'reset' })
    set({ tree: [], contextLinks: [], latest: null, history: [], selectedId: null, hasInteracted: false })
  },
}))

// Dev-only handle for debugging / automated verification.
if (import.meta.env.DEV) {
  ;(window as unknown as { __rrStore?: typeof useStore }).__rrStore = useStore
}
