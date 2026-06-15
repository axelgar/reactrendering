import * as Babel from '@babel/standalone'
import { instrumentPlugin } from '../../runtime/instrument/plugin'

// Two passes: instrument plain React → instrumented TSX, then compile to
// executable CommonJS (resolved by the iframe's require-shim). The React
// Compiler is NOT run here — it needs Node builtins that fight the browser, so
// its output is pre-generated at build time (see the rr-react-compiler Vite
// plugin) and fed in as a scenario variant.
function compile(source: string): string {
  const instrumented =
    Babel.transform(source, {
      filename: 'scenario.tsx',
      parserOpts: { plugins: ['typescript', 'jsx'] },
      plugins: [[instrumentPlugin, { trackModule: '@rr/track' }]],
    }).code ?? ''

  return (
    Babel.transform(instrumented, {
      filename: 'scenario.tsx',
      presets: [
        ['react', { runtime: 'automatic', development: false }],
        ['typescript', { isTSX: true, allExtensions: true }],
      ],
      plugins: ['transform-modules-commonjs'],
    }).code ?? ''
  )
}

interface CompileRequest {
  id: number
  source: string
}

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<CompileRequest>) => void) | null
  postMessage: (message: unknown) => void
}

ctx.onmessage = (e) => {
  const { id, source } = e.data
  try {
    ctx.postMessage({ id, ok: true, code: compile(source) })
  } catch (err) {
    ctx.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) })
  }
}
