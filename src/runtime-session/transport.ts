import { isRuntimeMessage, type RuntimeMessage, type ShellMessage } from '../../shared/protocol'

// The seam over "talk to one Runtime." The real adapter wraps an iframe; a fake
// adapter lets a RuntimeSession be driven in tests with no iframe at all.
export interface RuntimeTransport {
  send(msg: ShellMessage): void
  subscribe(cb: (msg: RuntimeMessage) => void): () => void
  dispose(): void
}

// Real adapter: one sandbox iframe. Owns the postMessage send + the source-
// filtered window listener (only this iframe's messages get through).
export class IframeTransport implements RuntimeTransport {
  constructor(private readonly iframe: HTMLIFrameElement) {}

  send(msg: ShellMessage): void {
    this.iframe.contentWindow?.postMessage(msg, '*')
  }

  subscribe(cb: (msg: RuntimeMessage) => void): () => void {
    const handle = (ev: MessageEvent) => {
      if (ev.source !== this.iframe.contentWindow) return
      if (isRuntimeMessage(ev.data)) cb(ev.data)
    }
    window.addEventListener('message', handle)
    return () => window.removeEventListener('message', handle)
  }

  dispose(): void {
    /* the subscribe() cleanup owns listener teardown; nothing else to release */
  }
}
