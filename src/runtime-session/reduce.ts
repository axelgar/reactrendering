import type { CommitFrame, ContextLink, RuntimeMessage, TreeNode } from '../../shared/protocol'

export interface RunError {
  phase: 'compile' | 'runtime'
  message: string
}

/** The render-log facts one Runtime Session currently holds. */
export interface SessionState {
  tree: TreeNode[]
  contextLinks: ContextLink[]
  latest: CommitFrame | null
  history: CommitFrame[]
  ready: boolean
  error: RunError | null
}

export const initialSessionState: SessionState = {
  tree: [],
  contextLinks: [],
  latest: null,
  history: [],
  ready: false,
  error: null,
}

const HISTORY_CAP = 50

// Every state transition flows through here. RuntimeMessages come off the wire;
// the `compile-*`/`clear`/`reset` events are shell-side (the compile→run loop and
// scenario swaps). Keeping it a pure function makes the whole reduction testable
// with no iframe — feed a sequence of events, assert the resulting SessionState.
export type SessionEvent =
  | RuntimeMessage
  | { kind: 'compile-ok' }
  | { kind: 'compile-error'; message: string }
  | { kind: 'clear' }
  | { kind: 'reset' }

export function reduce(state: SessionState, e: SessionEvent): SessionState {
  switch (e.kind) {
    case 'ready':
      return state.ready ? state : { ...state, ready: true }
    case 'tree':
      return { ...state, tree: e.nodes, contextLinks: e.contextLinks }
    case 'commit':
      return {
        ...state,
        latest: e.frame,
        history: [...state.history, e.frame].slice(-HISTORY_CAP),
        // A fresh commit means the current code runs — clear any runtime error.
        error: state.error?.phase === 'runtime' ? null : state.error,
      }
    case 'error':
      return { ...state, error: { phase: 'runtime', message: e.message } }
    case 'compile-error':
      return { ...state, error: { phase: 'compile', message: e.message } }
    case 'compile-ok':
      return state.error?.phase === 'compile' ? { ...state, error: null } : state
    case 'clear':
      // Scenario/variant swap: drop the old render log, keep the connection.
      return { ...state, tree: [], contextLinks: [], latest: null, history: [] }
    case 'reset':
      // Runtime is reloading; a fresh `ready` will re-run the current source.
      return initialSessionState
    default:
      return state
  }
}

export type SessionStatus = 'connecting' | 'ready' | 'error'

export function deriveStatus(s: SessionState): SessionStatus {
  return s.error ? 'error' : s.ready ? 'ready' : 'connecting'
}
