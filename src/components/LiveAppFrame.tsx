import { useEffect, useRef } from 'react'
import { isRuntimeMessage, SHELL_SOURCE } from '../../shared/protocol'
import { useStore } from '../store'
import { compile } from '../compileClient'

// Hosts the sandboxed runtime iframe, bridges its messages into the store, and
// drives the compile → run loop whenever the source changes.
export function LiveAppFrame() {
  const ref = useRef<HTMLIFrameElement>(null)
  const setPost = useStore((s) => s.setPost)
  const onReady = useStore((s) => s.onReady)
  const onRuntimeError = useStore((s) => s.onRuntimeError)
  const onTree = useStore((s) => s.onTree)
  const onCommit = useStore((s) => s.onCommit)
  const setCompileError = useStore((s) => s.setCompileError)
  const source = useStore((s) => s.source)
  const iframeReady = useStore((s) => s.iframeReady)

  useEffect(() => {
    function handle(ev: MessageEvent) {
      if (ev.source !== ref.current?.contentWindow) return
      if (!isRuntimeMessage(ev.data)) return
      const msg = ev.data
      if (msg.kind === 'tree') onTree(msg.nodes, msg.contextLinks)
      else if (msg.kind === 'commit') onCommit(msg.frame)
      else if (msg.kind === 'ready') onReady()
      else if (msg.kind === 'error') onRuntimeError(msg.message)
    }
    window.addEventListener('message', handle)
    return () => window.removeEventListener('message', handle)
  }, [onReady, onRuntimeError, onTree, onCommit])

  useEffect(() => {
    setPost((msg) => ref.current?.contentWindow?.postMessage(msg, '*'))
  }, [setPost])

  // Compile + run once the iframe is ready, and on every (debounced) edit.
  useEffect(() => {
    if (!iframeReady) return
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const code = await compile(source)
        if (cancelled) return
        setCompileError(null)
        ref.current?.contentWindow?.postMessage({ source: SHELL_SOURCE, kind: 'run', code }, '*')
      } catch (e) {
        if (!cancelled) setCompileError(e instanceof Error ? e.message : String(e))
      }
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [source, iframeReady, setCompileError])

  return (
    <iframe
      ref={ref}
      src="/runtime.html"
      title="Live app — real, instrumented React"
      className="live-frame"
      sandbox="allow-scripts allow-same-origin"
    />
  )
}
