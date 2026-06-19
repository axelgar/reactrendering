import { createContext, useContext, useMemo, useSyncExternalStore } from 'react'
import { useStore } from '../store'
import type { NodeId } from '../../shared/protocol'
import type { RuntimeSession } from './RuntimeSession'
import type { SessionState } from './reduce'

const RuntimeSessionContext = createContext<RuntimeSession | null>(null)

export const RuntimeSessionProvider = RuntimeSessionContext.Provider

/** Subscribe to a specific session's state (used directly in Compare Mode). */
export function useSessionState(session: RuntimeSession): SessionState {
  return useSyncExternalStore(session.subscribe, session.getState, session.getState)
}

/** The session provided to the current subtree (single mode). */
export function useActiveSession(): RuntimeSession {
  const session = useContext(RuntimeSessionContext)
  if (!session) throw new Error('useActiveSession must be used within a RuntimeSessionProvider')
  return session
}

/** Render-log facts of the active session — the read path for TreeView/WhyPanel. */
export function useRuntimeSession(): SessionState {
  return useSessionState(useActiveSession())
}

/** Actions that target the active runtime, coordinated with view state. */
export function useRuntimeActions(): { forceNode: (id: NodeId) => void; reset: () => void } {
  const session = useActiveSession()
  return useMemo(
    () => ({
      forceNode: (id: NodeId) => session.forceNode(id),
      reset: () => {
        session.reset()
        useStore.getState().resetView()
      },
    }),
    [session],
  )
}
