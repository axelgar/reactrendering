import {
  Children,
  cloneElement,
  createContext,
  Fragment,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ComponentType,
  type Context,
  type FC,
  type ReactNode,
  type SetStateAction,
} from 'react'
import {
  RUNTIME_SOURCE,
  type ContextLink,
  type NodeId,
  type ReasonCode,
  type RenderEvent,
  type RuntimeMessage,
  type Trigger,
  type TreeNode,
} from '../shared/protocol'

// ── Context threading ───────────────────────────────────────────────────────
// Each tracked component provides its own id (and depth) to its subtree, so the
// real *mounted* tree falls out of instrumentation — no fiber walking.
const ParentCtx = createContext<NodeId | null>(null)
const DepthCtx = createContext<number>(0)

// ── Collectors (refs/stores only; the one injected piece of state is the
//    per-node force-update switch, idle unless poked) ─────────────────────────
const registry = new Map<NodeId, TreeNode>()
const forceUpdaters = new Map<NodeId, () => void>()
const renderCounts = new Map<NodeId, number>()
const lastProps = new Map<NodeId, Record<string, unknown>>()

let pending: RenderEvent[] = []
let renderOrder = 0
let currentTrigger: Trigger | null = null
let seq = 0
let idCounter = 0
let currentRenderingId: NodeId | null = null
// Ids of components whose consumed context value changed this commit.
const contextChanged = new Set<NodeId>()

// Context relationships (for the context edge layer). Each context gets an id
// (tagged onto the context object + its Provider); we record which components
// provide it and which consume it.
let ctxCounter = 0
const contextProviders = new Map<string, Set<NodeId>>()
const contextConsumers = new Map<string, Set<NodeId>>()

/** Like createContext, but tags the context so providers/consumers can be linked. */
export function trackedCreateContext<T>(defaultValue: T): Context<T> {
  const ctx = createContext(defaultValue)
  const id = `x${ctxCounter++}`
  ;(ctx as unknown as { __rrId?: string }).__rrId = id
  ;(ctx.Provider as unknown as { __rrId?: string }).__rrId = id
  return ctx
}

// Walk a component's returned element tree for <Ctx.Provider> elements (tagged
// with __rrId), recording that this component provides that context. Stops at
// child components — they register their own providers when they render.
function registerProviders(node: ReactNode, ownerId: NodeId) {
  if (!isValidElement(node)) return
  const type = node.type as unknown as { __rrId?: string }
  const ctxId = type?.__rrId
  if (ctxId) {
    let set = contextProviders.get(ctxId)
    if (!set) contextProviders.set(ctxId, (set = new Set()))
    set.add(ownerId)
  }
  const isContainer = typeof node.type === 'string' || node.type === Fragment || !!ctxId
  if (isContainer) {
    Children.forEach((node.props as { children?: ReactNode }).children, (c) => registerProviders(c, ownerId))
  }
}

// For each consumer, link it to the nearest ancestor that provides the context.
function buildContextLinks(): ContextLink[] {
  const links: ContextLink[] = []
  for (const [ctxId, consumers] of contextConsumers) {
    const providers = contextProviders.get(ctxId)
    if (!providers || providers.size === 0) continue
    for (const consumerId of consumers) {
      let cur = registry.get(consumerId)?.parentId ?? null
      while (cur) {
        if (providers.has(cur)) {
          links.push({ providerId: cur, consumerId })
          break
        }
        cur = registry.get(cur)?.parentId ?? null
      }
    }
  }
  return links
}

// Circuit breaker + error reporting
let recentCommits: number[] = []
let breakerTripped = false
let errorSink: ((message: string) => void) | null = null

// Commit attribution: which components actually changed the DOM this commit.
// We tag each component's host element with data-rr-id, then map DOM mutations
// back to the nearest tagged ancestor. Records are drained synchronously at the
// commit boundary via takeRecords() (the callback itself is a no-op).
let observer: MutationObserver | null = null

export function startCommitObserver() {
  if (observer) return
  observer = new MutationObserver(() => {})
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeOldValue: true,
    characterData: true,
    characterDataOldValue: true,
  })
}

function drainCommitted(): NodeId[] {
  if (!observer) return []
  const records = observer.takeRecords()
  if (records.length === 0) return []

  // Only count a node as having "changed the DOM" if something NET-changed.
  // React re-applies name/type on controlled inputs to the same value on every
  // update (a documented workaround) — those are no-ops, not real changes.
  const firstOld = new Map<Element, Map<string, string | null>>()
  const changed = new Set<Node>()

  for (const rec of records) {
    if (rec.type === 'attributes' && rec.attributeName) {
      const el = rec.target as Element
      let attrs = firstOld.get(el)
      if (!attrs) {
        attrs = new Map()
        firstOld.set(el, attrs)
      }
      if (!attrs.has(rec.attributeName)) attrs.set(rec.attributeName, rec.oldValue)
    } else if (rec.type === 'characterData') {
      if ((rec.target as CharacterData).data !== rec.oldValue) changed.add(rec.target)
    } else if (rec.type === 'childList') {
      if (rec.addedNodes.length || rec.removedNodes.length) changed.add(rec.target)
    }
  }
  for (const [el, attrs] of firstOld) {
    for (const [attr, old] of attrs) {
      if (el.getAttribute(attr) !== old) {
        changed.add(el)
        break
      }
    }
  }

  const ids = new Set<NodeId>()
  for (const target of changed) {
    let node: Node | null = target
    while (node) {
      if (node instanceof Element) {
        const id = node.getAttribute('data-rr-id')
        if (id) {
          ids.add(id)
          break
        }
      }
      node = node.parentNode
    }
  }
  return Array.from(ids)
}

// Tag a component's host root with its id, so DOM mutations can be attributed.
function tagHost(node: ReactNode, id: NodeId): ReactNode {
  return isValidElement(node) && typeof node.type === 'string'
    ? cloneElement(node, { 'data-rr-id': id } as Record<string, unknown>)
    : node
}

export function setErrorSink(fn: (message: string) => void) {
  errorSink = fn
}

/** Clear all per-run state. Called before executing freshly-compiled code. */
export function resetRuntime() {
  registry.clear()
  forceUpdaters.clear()
  renderCounts.clear()
  lastProps.clear()
  pending = []
  renderOrder = 0
  currentTrigger = null
  seq = 0
  recentCommits = []
  breakerTripped = false
  contextProviders.clear()
  contextConsumers.clear()
  contextChanged.clear()
}

// ── Bridge out ───────────────────────────────────────────────────────────────
function post(msg: RuntimeMessage) {
  window.parent.postMessage(msg, '*')
}

function postTree() {
  post({
    source: RUNTIME_SOURCE,
    kind: 'tree',
    nodes: Array.from(registry.values()),
    contextLinks: buildContextLinks(),
  })
}

/** Force a specific node to re-render (driven by the shell). */
export function forceNode(id: NodeId) {
  const name = registry.get(id)?.name ?? '?'
  currentTrigger = { type: 'force', id, name }
  forceUpdaters.get(id)?.()
}

// ── Causality ────────────────────────────────────────────────────────────────
// Returns a machine code (localized by the shell) plus an English fallback string.
function explain(e: RenderEvent, trigger: Trigger): { code: ReasonCode; text: string } {
  if (e.renderCount === 1) {
    return trigger.type === 'mount'
      ? { code: 'mount-first', text: 'Mounted for the first time.' }
      : { code: 'mount-new', text: 'Mounted — a new instance was added to the tree.' }
  }
  if (trigger.type === 'force' && e.id === trigger.id) {
    return { code: 'forced', text: 'Forced to re-render — you poked this node directly.' }
  }
  if (trigger.type === 'state' && e.id === trigger.sourceId) {
    return { code: 'state-source', text: 'State changed here — this is where the update starts.' }
  }
  if (contextChanged.has(e.id)) {
    return {
      code: 'context',
      text: 'Re-rendered because a context it reads changed — React re-renders consumers directly, even past memoized parents.',
    }
  }
  if (e.propsChanged.length > 0) {
    return { code: 'props', text: `Re-rendered because props changed: ${e.propsChanged.join(', ')}.` }
  }
  return {
    code: 'wasted',
    text: 'Re-rendered only because its parent did — its props are identical (wasted render).',
  }
}

function diffProps(prev: Record<string, unknown>, next: Record<string, unknown>): string[] {
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)])
  const changed: string[] = []
  for (const k of keys) if (!Object.is(prev[k], next[k])) changed.push(k)
  return changed
}

// Root <Profiler> commit boundary.
function flushCommit(durationMs: number) {
  // Always drain — even on early return — so records don't bleed into the next
  // commit.
  const committed = new Set(drainCommitted())
  if (breakerTripped) return

  // Circuit breaker: too many commits per second ⇒ runaway loop.
  const now = Date.now()
  recentCommits.push(now)
  while (recentCommits.length && now - recentCommits[0] > 1000) recentCommits.shift()
  if (recentCommits.length > 80) {
    breakerTripped = true
    errorSink?.(
      'Render loop detected — the app committed too many times per second and was stopped. ' +
        'Look for a setState that runs on every render (e.g. an effect with no dependency array).',
    )
    return
  }

  if (pending.length === 0) return
  const trigger: Trigger = currentTrigger ?? { type: 'mount' }
  const renderedIds = new Set(pending.map((e) => e.id))
  const renders = pending.map((e) => {
    const { code, text } = explain(e, trigger)
    return { ...e, committed: committed.has(e.id), reason: text, reasonCode: code }
  })

  // Bailouts: a mounted node whose parent re-rendered but which itself did not.
  // That gap is exactly what memo (or a stable element) buys you.
  for (const node of registry.values()) {
    if (!renderedIds.has(node.id) && node.parentId !== null && renderedIds.has(node.parentId)) {
      renders.push({
        id: node.id,
        name: node.name,
        rendered: false,
        reason: 'Skipped (bailout) — memoized, and its props didn’t change.',
        reasonCode: 'bailout',
        propsChanged: [],
        renderCount: renderCounts.get(node.id) ?? 0,
        committed: false,
        depth: 0,
        order: 1000 + renders.length,
      })
    }
  }

  post({
    source: RUNTIME_SOURCE,
    kind: 'commit',
    frame: { seq: seq++, trigger, renders, committedIds: Array.from(committed), durationMs },
  })
  postTree()
  pending = []
  renderOrder = 0
  currentTrigger = null
  contextChanged.clear()
}

// Commit boundary. We can't use <Profiler onRender> because it's a no-op in
// React's production build (and the iframe runs the production build). Instead,
// any tracked render schedules a single microtask that runs *after* the commit
// (DOM mutated, MutationObserver records ready), then flushes once.
let flushScheduled = false
function scheduleFlush() {
  if (flushScheduled) return
  flushScheduled = true
  queueMicrotask(() => {
    flushScheduled = false
    flushCommit(0)
  })
}

// ── Public instrumentation API ───────────────────────────────────────────────

/** Wrap a component so every render is observed and the node is poke-able. */
export function track<P extends object>(name: string, Comp: ComponentType<P>): FC<P> {
  const Tracked: FC<P> = (props) => {
    const parentId = useContext(ParentCtx)
    const depth = useContext(DepthCtx)

    const idRef = useRef<string | null>(null)
    if (idRef.current === null) idRef.current = `n${idCounter++}`
    const id = idRef.current

    const [, forceTick] = useReducer((x: number) => x + 1, 0)

    const propKeys = Object.keys(props as Record<string, unknown>)
    const existingNode = registry.get(id)
    if (existingNode) existingNode.propKeys = propKeys
    else registry.set(id, { id, name, parentId, propKeys })

    const prev = lastProps.get(id)
    const propsChanged = prev ? diffProps(prev, props as Record<string, unknown>) : []
    lastProps.set(id, { ...(props as Record<string, unknown>) })
    const renderCount = (renderCounts.get(id) ?? 0) + 1
    renderCounts.set(id, renderCount)
    pending.push({
      id,
      name,
      rendered: true,
      reason: '',
      reasonCode: 'mount-first', // placeholder; explain() sets the real code at flush
      propsChanged,
      renderCount,
      committed: false,
      depth,
      order: renderOrder++,
    })
    scheduleFlush()

    useEffect(() => {
      forceUpdaters.set(id, forceTick)
      return () => {
        forceUpdaters.delete(id)
        registry.delete(id)
        renderCounts.delete(id)
        lastProps.delete(id)
        for (const set of contextProviders.values()) set.delete(id)
        for (const set of contextConsumers.values()) set.delete(id)
      }
    }, [id])

    // Run the component inline on this fiber so its own state lives here and its
    // own re-renders are recorded.
    const prevRenderingId = currentRenderingId
    currentRenderingId = id
    let out: ReactNode
    try {
      out = (Comp as (p: P) => ReactNode)(props)
    } finally {
      currentRenderingId = prevRenderingId
    }
    registerProviders(out, id)

    return (
      <ParentCtx.Provider value={id}>
        <DepthCtx.Provider value={depth + 1}>{tagHost(out, id)}</DepthCtx.Provider>
      </ParentCtx.Provider>
    )
  }
  Tracked.displayName = `Tracked(${name})`
  return Tracked
}

/** Like useState, but tags which component initiated each update. */
export function useTrackedState<T>(initial: T | (() => T)) {
  const selfId = currentRenderingId
  const [state, setState] = useState<T>(initial)
  // Stable identity, like a real useState setter — so a child receiving it as a
  // prop isn't falsely flagged as "props changed".
  const set = useCallback(
    (next: SetStateAction<T>) => {
      const name = (selfId && registry.get(selfId)?.name) || '?'
      currentTrigger = { type: 'state', sourceId: selfId ?? '?', sourceName: name, label: `setState in ${name}` }
      setState(next)
    },
    [selfId],
  )
  return [state, set] as const
}

/** Like useContext, but flags when the consumed value actually changed — so the
 *  narrator can say a re-render came from context (not from a parent). */
export function useTrackedContext<T>(ctx: Context<T>): T {
  const selfId = currentRenderingId
  const value = useContext(ctx)
  const ctxId = (ctx as unknown as { __rrId?: string }).__rrId
  if (ctxId && selfId) {
    let set = contextConsumers.get(ctxId)
    if (!set) contextConsumers.set(ctxId, (set = new Set()))
    set.add(selfId)
  }
  const ref = useRef<{ v: T } | null>(null)
  if (ref.current === null) {
    ref.current = { v: value }
  } else if (!Object.is(ref.current.v, value)) {
    if (selfId) contextChanged.add(selfId)
    ref.current.v = value
  }
  return value
}

/** Root wrapper: the root contexts. (The commit boundary is the microtask flush
 *  scheduled from track(), so this works in React's production build.) */
export function Runtime({ children }: { children: ReactNode }) {
  return (
    <ParentCtx.Provider value={null}>
      <DepthCtx.Provider value={0}>{children}</DepthCtx.Provider>
    </ParentCtx.Provider>
  )
}
