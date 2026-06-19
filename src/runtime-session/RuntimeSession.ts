import { shellMsg, type NodeId } from '../../shared/protocol'
import { initialSessionState, reduce, type SessionEvent, type SessionState } from './reduce'
import type { RuntimeTransport } from './transport'

const DEBOUNCE_MS = 350

// Owns one Runtime's whole lifecycle: holds a transport + a compile function,
// runs the debounced compile→run loop for the current source, and reduces every
// incoming message into SessionState. `subscribe`/`getState` make it bindable
// with React's useSyncExternalStore without React knowing any of the above.
export class RuntimeSession {
  private state: SessionState = initialSessionState
  private readonly listeners = new Set<() => void>()
  private transport: RuntimeTransport | null = null
  private unsubscribe: (() => void) | null = null
  private source: string | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private runToken = 0

  constructor(private readonly compile: (source: string) => Promise<string>) {}

  getState = (): SessionState => this.state

  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  /** Bind to a Runtime. Re-runs the current source as soon as it reports ready. */
  attach(transport: RuntimeTransport): void {
    this.detach()
    this.transport = transport
    this.unsubscribe = transport.subscribe((msg) => {
      this.dispatch(msg)
      if (msg.kind === 'ready') this.scheduleRun(0)
    })
  }

  detach(): void {
    this.unsubscribe?.()
    this.unsubscribe = null
    this.transport?.dispose()
    this.transport = null
  }

  /** Set the source to run. Debounced for live edits; immediate for swaps. */
  setSource(source: string, opts: { immediate?: boolean } = {}): void {
    this.source = source
    this.scheduleRun(opts.immediate ? 0 : DEBOUNCE_MS)
  }

  /** Drop the current render log but keep the connection (scenario/variant swap). */
  clear(): void {
    this.dispatch({ kind: 'clear' })
  }

  forceNode(id: NodeId): void {
    this.transport?.send(shellMsg.force(id))
  }

  reset(): void {
    this.transport?.send(shellMsg.reset())
    this.dispatch({ kind: 'reset' })
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this.detach()
    this.listeners.clear()
  }

  private scheduleRun(delay: number): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      void this.run()
    }, delay)
  }

  // Compile the current source and post `run`. Only fires once the Runtime is
  // ready; the runToken discards a stale compile if the source changed meanwhile.
  private async run(): Promise<void> {
    const transport = this.transport
    if (!transport || !this.state.ready || this.source == null) return
    const token = ++this.runToken
    try {
      const code = await this.compile(this.source)
      if (token !== this.runToken) return
      this.dispatch({ kind: 'compile-ok' })
      transport.send(shellMsg.run(code))
    } catch (e) {
      if (token !== this.runToken) return
      this.dispatch({ kind: 'compile-error', message: e instanceof Error ? e.message : String(e) })
    }
  }

  private dispatch(event: SessionEvent): void {
    const next = reduce(this.state, event)
    if (next === this.state) return
    this.state = next
    this.listeners.forEach((l) => l())
  }
}
