import { describe, expect, it } from 'vitest'
import { RUNTIME_SOURCE, type CommitFrame, type RuntimeMessage, type TreeNode } from '../../shared/protocol'
import { deriveStatus, initialSessionState, reduce, type SessionState } from './reduce'

const node = (id: string, parentId: string | null = null): TreeNode => ({ id, name: id, parentId })
const frame = (seq: number, trigger: CommitFrame['trigger'] = { type: 'mount' }): CommitFrame => ({
  seq,
  trigger,
  renders: [],
  committedIds: [],
  durationMs: 1,
})
const ready = (): RuntimeMessage => ({ source: RUNTIME_SOURCE, kind: 'ready' })
const treeMsg = (nodes: TreeNode[]): RuntimeMessage => ({ source: RUNTIME_SOURCE, kind: 'tree', nodes, contextLinks: [] })
const commitMsg = (f: CommitFrame): RuntimeMessage => ({ source: RUNTIME_SOURCE, kind: 'commit', frame: f })
const errorMsg = (message: string): RuntimeMessage => ({ source: RUNTIME_SOURCE, kind: 'error', message })

const withError = (phase: 'compile' | 'runtime'): SessionState => ({
  ...initialSessionState,
  error: { phase, message: 'x' },
})

describe('reduce', () => {
  it('starts empty and not ready', () => {
    expect(initialSessionState).toEqual({
      tree: [],
      contextLinks: [],
      latest: null,
      history: [],
      ready: false,
      error: null,
    })
  })

  it('marks ready, and is idempotent (same ref when already ready)', () => {
    const r = reduce(initialSessionState, ready())
    expect(r.ready).toBe(true)
    expect(reduce(r, ready())).toBe(r) // no churn — stable ref for useSyncExternalStore
  })

  it('sets tree and context links from a tree message', () => {
    const r = reduce(initialSessionState, treeMsg([node('a'), node('b', 'a')]))
    expect(r.tree).toHaveLength(2)
    expect(r.tree[1]).toEqual(node('b', 'a'))
  })

  it('records the latest commit and appends to history', () => {
    let s = reduce(initialSessionState, commitMsg(frame(1)))
    s = reduce(s, commitMsg(frame(2, { type: 'force', id: 'a', name: 'A' })))
    expect(s.latest?.seq).toBe(2)
    expect(s.history.map((f) => f.seq)).toEqual([1, 2])
  })

  it('caps history at 50, keeping the most recent', () => {
    let s = initialSessionState
    for (let i = 1; i <= 51; i++) s = reduce(s, commitMsg(frame(i)))
    expect(s.history).toHaveLength(50)
    expect(s.history[0].seq).toBe(2) // oldest dropped
    expect(s.latest?.seq).toBe(51)
  })

  it('a fresh commit clears a runtime error but leaves a compile error', () => {
    expect(reduce(withError('runtime'), commitMsg(frame(1))).error).toBeNull()
    expect(reduce(withError('compile'), commitMsg(frame(1))).error).toEqual({ phase: 'compile', message: 'x' })
  })

  it('records runtime and compile errors under the right phase', () => {
    expect(reduce(initialSessionState, errorMsg('blew up')).error).toEqual({ phase: 'runtime', message: 'blew up' })
    expect(reduce(initialSessionState, { kind: 'compile-error', message: 'syntax' }).error).toEqual({
      phase: 'compile',
      message: 'syntax',
    })
  })

  it('compile-ok clears only a compile error', () => {
    expect(reduce(withError('compile'), { kind: 'compile-ok' }).error).toBeNull()
    const runtime = withError('runtime')
    expect(reduce(runtime, { kind: 'compile-ok' })).toBe(runtime) // untouched, same ref
  })

  it('clear empties the render log but keeps the connection', () => {
    let s = reduce(initialSessionState, ready())
    s = reduce(s, treeMsg([node('a')]))
    s = reduce(s, commitMsg(frame(1)))
    const cleared = reduce(s, { kind: 'clear' })
    expect(cleared.tree).toEqual([])
    expect(cleared.latest).toBeNull()
    expect(cleared.history).toEqual([])
    expect(cleared.ready).toBe(true) // still connected
  })

  it('reset clears the render log and any error but stays connected (re-runs in place)', () => {
    let s = reduce(initialSessionState, ready())
    s = reduce(s, treeMsg([node('a')]))
    s = reduce(s, commitMsg(frame(1)))
    s = reduce(s, errorMsg('boom'))
    const r = reduce(s, { kind: 'reset' })
    expect(r.tree).toEqual([])
    expect(r.contextLinks).toEqual([])
    expect(r.latest).toBeNull()
    expect(r.history).toEqual([])
    expect(r.error).toBeNull()
    expect(r.ready).toBe(true) // connection stays up; the queued run repopulates it
  })

  it('ignores unknown events without churning the reference', () => {
    const s = reduce(initialSessionState, ready())
    expect(reduce(s, { kind: 'nope' } as never)).toBe(s)
  })
})

describe('deriveStatus', () => {
  it('is connecting before ready', () => {
    expect(deriveStatus(initialSessionState)).toBe('connecting')
  })
  it('is ready once ready with no error', () => {
    expect(deriveStatus({ ...initialSessionState, ready: true })).toBe('ready')
  })
  it('is error whenever an error is present, even if ready', () => {
    expect(deriveStatus({ ...initialSessionState, ready: true, error: { phase: 'runtime', message: 'x' } })).toBe('error')
  })
})
