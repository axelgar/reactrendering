import { Component, useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { Runtime, resetRuntime, forceNode, setErrorSink, startCommitObserver } from './track'
import { executeModule } from './execute'
import { isShellMessage, RUNTIME_SOURCE, type RuntimeMessage } from '../shared/protocol'

function post(msg: RuntimeMessage) {
  window.parent.postMessage(msg, '*')
}

// Catches errors thrown while rendering executed scenario code (including
// React's own "Too many re-renders" guard) and surfaces them instead of a
// white screen.
class Boundary extends Component<
  { resetKey: number; onError: (m: string) => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: Error) {
    this.props.onError(err?.message ?? String(err))
  }
  componentDidUpdate(prev: { resetKey: number }) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false })
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

function ErrorOverlay({ message }: { message: string }) {
  return (
    <div className="rt-overlay">
      <div className="rt-overlay-card">
        <span className="rt-overlay-tag">can’t run this code</span>
        <p>{message}</p>
      </div>
    </div>
  )
}

export function Host() {
  const [Root, setRoot] = useState<ComponentType | null>(null)
  const [runSeq, setRunSeq] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fail = (m: string) => {
      setError(m)
      post({ source: RUNTIME_SOURCE, kind: 'error', message: m })
    }
    setErrorSink(fail)
    startCommitObserver()

    function onMessage(ev: MessageEvent) {
      if (!isShellMessage(ev.data)) return
      const msg = ev.data
      if (msg.kind === 'run') {
        try {
          resetRuntime()
          const C = executeModule(msg.code)
          setError(null)
          setRoot(() => C)
          setRunSeq((n) => n + 1)
        } catch (e) {
          fail(e instanceof Error ? e.message : String(e))
          setRoot(null)
        }
      } else if (msg.kind === 'forceUpdate') {
        forceNode(msg.id)
      } else if (msg.kind === 'reset') {
        window.location.reload()
      }
    }

    window.addEventListener('message', onMessage)
    post({ source: RUNTIME_SOURCE, kind: 'ready' })
    return () => window.removeEventListener('message', onMessage)
  }, [])

  if (error) return <ErrorOverlay message={error} />
  if (!Root) return <div className="rt-splash">Compiling…</div>
  return (
    <Boundary
      resetKey={runSeq}
      onError={(m) => {
        setError(m)
        post({ source: RUNTIME_SOURCE, kind: 'error', message: m })
      }}
    >
      <Runtime key={runSeq}>
        <Root />
      </Runtime>
    </Boundary>
  )
}
