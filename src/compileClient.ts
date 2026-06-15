// Thin promise wrapper around the compile Web Worker.

let worker: Worker | null = null
let seq = 0
const pending = new Map<number, { resolve: (code: string) => void; reject: (err: Error) => void }>()

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./worker/compile.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent) => {
      const { id, ok, code, error } = e.data as { id: number; ok: boolean; code?: string; error?: string }
      const p = pending.get(id)
      if (!p) return
      pending.delete(id)
      if (ok && code != null) p.resolve(code)
      else p.reject(new Error(error ?? 'Unknown compile error'))
    }
  }
  return worker
}

/** Compile + instrument scenario source off the main thread. */
export function compile(source: string): Promise<string> {
  const id = ++seq
  return new Promise<string>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ id, source })
  })
}
