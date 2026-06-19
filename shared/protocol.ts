// The wire protocol between the shell (parent window) and the runtime (iframe).
// Kept dependency-free so both bundles can import it.

export type NodeId = string

/** A mounted component instance, as discovered by instrumentation (no fiber walking). */
export interface TreeNode {
  id: NodeId
  name: string
  parentId: NodeId | null
  /** Prop names this component currently receives (for the props-flow layer). */
  propKeys?: string[]
}

/** A context relationship: a provider component reaches a consumer component. */
export interface ContextLink {
  providerId: NodeId
  consumerId: NodeId
}

/** What kicked off a commit — used by the narrator to explain causality. */
export type Trigger =
  | { type: 'mount' }
  | { type: 'state'; sourceId: NodeId; sourceName: string; label: string }
  | { type: 'force'; id: NodeId; name: string }

/** One component's outcome within a single commit. */
export interface RenderEvent {
  id: NodeId
  name: string
  /** false = the component instance existed but did not re-run (bailed/skipped). */
  rendered: boolean
  /** Plain-language explanation, derived from real instrumentation. */
  reason: string
  /** Prop keys whose identity changed since the previous render (Object.is). */
  propsChanged: string[]
  /** Cumulative render count for this instance. */
  renderCount: number
  /** Did this component's own DOM change in this commit? (commit vs render) */
  committed: boolean
  /** Depth in the tree, for staggered replay. */
  depth: number
  /** Order the component re-ran in, within this commit. */
  order: number
}

/** Everything that happened in one React commit. */
export interface CommitFrame {
  seq: number
  trigger: Trigger
  renders: RenderEvent[]
  committedIds: NodeId[]
  durationMs: number
}

/** runtime (iframe) → shell (parent) */
export type RuntimeMessage =
  | { source: typeof RUNTIME_SOURCE; kind: 'ready' }
  | { source: typeof RUNTIME_SOURCE; kind: 'tree'; nodes: TreeNode[]; contextLinks: ContextLink[] }
  | { source: typeof RUNTIME_SOURCE; kind: 'commit'; frame: CommitFrame }
  | { source: typeof RUNTIME_SOURCE; kind: 'error'; message: string }

/** shell (parent) → runtime (iframe) */
export type ShellMessage =
  | { source: typeof SHELL_SOURCE; kind: 'forceUpdate'; id: NodeId }
  | { source: typeof SHELL_SOURCE; kind: 'reset' }
  | { source: typeof SHELL_SOURCE; kind: 'run'; code: string }

export const RUNTIME_SOURCE = 'rr-runtime'
export const SHELL_SOURCE = 'rr-shell'

/** Construct shell→runtime messages. The single place that frames `source`. */
export const shellMsg = {
  run: (code: string): ShellMessage => ({ source: SHELL_SOURCE, kind: 'run', code }),
  force: (id: NodeId): ShellMessage => ({ source: SHELL_SOURCE, kind: 'forceUpdate', id }),
  reset: (): ShellMessage => ({ source: SHELL_SOURCE, kind: 'reset' }),
}

export function isRuntimeMessage(data: unknown): data is RuntimeMessage {
  return !!data && typeof data === 'object' && (data as { source?: string }).source === RUNTIME_SOURCE
}

export function isShellMessage(data: unknown): data is ShellMessage {
  return !!data && typeof data === 'object' && (data as { source?: string }).source === SHELL_SOURCE
}
