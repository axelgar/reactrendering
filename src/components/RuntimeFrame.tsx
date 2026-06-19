import { useEffect, useRef } from 'react'
import { IframeTransport } from '../runtime-session/transport'
import type { RuntimeSession } from '../runtime-session/RuntimeSession'

// Renders one sandbox iframe and wires its transport to a RuntimeSession. All
// the compile→run and message→state logic lives in the session — this is just
// the DOM seam (mirrors the old setPost-on-mount pattern).
export function RuntimeFrame({ session }: { session: RuntimeSession }) {
  const ref = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!ref.current) return
    session.attach(new IframeTransport(ref.current))
    return () => session.detach()
  }, [session])

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
