import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RUNTIME_SOURCE, SHELL_SOURCE, type CommitFrame, type RuntimeMessage, type ShellMessage } from '../../shared/protocol'
import { RuntimeSession } from './RuntimeSession'
import type { RuntimeTransport } from './transport'

// Fake adapter at the transport seam: records what the session sends, and lets a
// test play the runtime by emitting messages back. No iframe, no worker.
class FakeTransport implements RuntimeTransport {
  sent: ShellMessage[] = []
  disposed = false
  private cb: ((m: RuntimeMessage) => void) | null = null

  send(msg: ShellMessage): void {
    this.sent.push(msg)
  }
  subscribe(cb: (m: RuntimeMessage) => void): () => void {
    this.cb = cb
    return () => {
      this.cb = null
    }
  }
  dispose(): void {
    this.disposed = true
  }
  /** Test helper: simulate the runtime emitting a message. */
  emit(msg: RuntimeMessage): void {
    this.cb?.(msg)
  }
  runs(): string[] {
    return this.sent.filter((m) => m.kind === 'run').map((m) => (m as { code: string }).code)
  }
}

const ready = (): RuntimeMessage => ({ source: RUNTIME_SOURCE, kind: 'ready' })
const commitMsg = (frame: CommitFrame): RuntimeMessage => ({ source: RUNTIME_SOURCE, kind: 'commit', frame })
const mountFrame: CommitFrame = { seq: 1, trigger: { type: 'mount' }, renders: [], committedIds: [], durationMs: 1 }

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

async function readySession() {
  const transport = new FakeTransport()
  const compile = vi.fn(async (src: string) => `C(${src})`)
  const session = new RuntimeSession(compile)
  session.attach(transport)
  transport.emit(ready()) // becomes ready; with no source yet the run is a no-op
  await vi.advanceTimersByTimeAsync(0)
  return { transport, compile, session }
}

describe('RuntimeSession', () => {
  it('does not run until the runtime reports ready, then runs the current source', async () => {
    const transport = new FakeTransport()
    const compile = vi.fn(async (src: string) => `C(${src})`)
    const session = new RuntimeSession(compile)
    session.attach(transport)

    session.setSource('A')
    await vi.advanceTimersByTimeAsync(350)
    expect(compile).not.toHaveBeenCalled() // gated on ready
    expect(transport.runs()).toEqual([])

    transport.emit(ready())
    await vi.advanceTimersByTimeAsync(0)
    expect(transport.runs()).toEqual(['C(A)'])
  })

  it('debounces rapid edits into a single run of the latest source', async () => {
    const { transport, compile, session } = await readySession()
    transport.sent.length = 0
    compile.mockClear()

    session.setSource('a')
    session.setSource('ab')
    session.setSource('abc')
    await vi.advanceTimersByTimeAsync(349)
    expect(compile).not.toHaveBeenCalled() // still within the debounce window
    await vi.advanceTimersByTimeAsync(1)
    expect(compile).toHaveBeenCalledTimes(1)
    expect(transport.runs()).toEqual(['C(abc)'])
  })

  it('runs an immediate source swap without waiting for the debounce', async () => {
    const { transport, session } = await readySession()
    session.setSource('swapped', { immediate: true })
    await vi.advanceTimersByTimeAsync(0)
    expect(transport.runs()).toEqual(['C(swapped)'])
  })

  it('surfaces a compile failure as a compile-phase error', async () => {
    const transport = new FakeTransport()
    const compile = vi.fn(async () => {
      throw new Error('Unexpected token')
    })
    const session = new RuntimeSession(compile)
    session.attach(transport)
    transport.emit(ready())
    session.setSource('broken')
    await vi.advanceTimersByTimeAsync(350)
    expect(session.getState().error).toEqual({ phase: 'compile', message: 'Unexpected token' })
    expect(transport.runs()).toEqual([])
  })

  it('discards a stale compile when the source changes mid-flight', async () => {
    let resolveSlow!: (code: string) => void
    const compile = vi.fn((src: string) =>
      src === 'slow' ? new Promise<string>((r) => (resolveSlow = r)) : Promise.resolve(`C(${src})`),
    )
    const transport = new FakeTransport()
    const session = new RuntimeSession(compile)
    session.attach(transport)
    transport.emit(ready())

    session.setSource('slow')
    await vi.advanceTimersByTimeAsync(350) // compile('slow') is now pending
    session.setSource('fast')
    await vi.advanceTimersByTimeAsync(350) // compile('fast') resolves and runs

    resolveSlow('C(slow)') // the superseded compile finally resolves…
    await vi.advanceTimersByTimeAsync(0)

    expect(transport.runs()).toEqual(['C(fast)']) // …and is discarded by the run token
  })

  it('feeds incoming commits into state and notifies subscribers', async () => {
    const { transport, session } = await readySession()
    const sub = vi.fn()
    session.subscribe(sub)
    transport.emit(commitMsg(mountFrame))
    expect(session.getState().latest?.seq).toBe(1)
    expect(sub).toHaveBeenCalled()
  })

  it('sends a framed forceUpdate to the runtime', async () => {
    const { transport, session } = await readySession()
    session.forceNode('node-7')
    expect(transport.sent).toContainEqual({ source: SHELL_SOURCE, kind: 'forceUpdate', id: 'node-7' })
  })

  it('reset re-runs the current source from scratch instead of reloading the iframe', async () => {
    const { transport, session } = await readySession()
    session.setSource('A', { immediate: true })
    await vi.advanceTimersByTimeAsync(0)
    transport.emit(commitMsg(mountFrame))
    expect(session.getState().latest?.seq).toBe(1)

    transport.sent.length = 0
    session.reset()
    expect(session.getState().latest).toBeNull() // render log dropped immediately
    expect(session.getState().ready).toBe(true) // connection stays up (no reload)

    await vi.advanceTimersByTimeAsync(0)
    expect(transport.runs()).toEqual(['C(A)']) // current source re-ran over the live wire
  })

  it('detaches cleanly: a detached transport receives nothing and stops driving state', async () => {
    const { transport, session } = await readySession()
    session.detach()
    expect(transport.disposed).toBe(true)
    transport.emit(commitMsg(mountFrame)) // no live subscriber
    expect(session.getState().latest).toBeNull()
  })
})
