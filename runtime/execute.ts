import * as React from 'react'
import * as JsxRuntime from 'react/jsx-runtime'
import * as CompilerRuntime from 'react/compiler-runtime'
import { track, useTrackedState, useTrackedContext, trackedCreateContext } from './track'
import type { ComponentType } from 'react'

// Executes compiled-and-instrumented scenario code (CommonJS form) and returns
// its root component. Imports are resolved to THIS iframe's already-loaded React
// and runtime — so executed components share the host's React instance (hooks,
// context and the Profiler all work across the boundary).
export function executeModule(code: string): ComponentType {
  const moduleObj = { exports: {} as Record<string, unknown> }

  const requireShim = (name: string): unknown => {
    switch (name) {
      case 'react':
        return React
      case 'react/jsx-runtime':
      case 'react/jsx-dev-runtime':
        return JsxRuntime
      case 'react/compiler-runtime':
        return CompilerRuntime
      case '@rr/track':
        return { track, useTrackedState, useTrackedContext, trackedCreateContext }
      default:
        throw new Error(
          `Cannot import "${name}". Only "react" and the runtime are available inside a scenario.`,
        )
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const fn = new Function('require', 'module', 'exports', 'React', code)
  fn(requireShim, moduleObj, moduleObj.exports, React)

  const exp = moduleObj.exports
  const root =
    (exp.default as ComponentType | undefined) ??
    (Object.values(exp).find((v) => typeof v === 'function') as ComponentType | undefined)

  if (!root) {
    throw new Error(
      'No component was exported. Export your root component, e.g. `export default function App() { … }`.',
    )
  }
  return root
}
