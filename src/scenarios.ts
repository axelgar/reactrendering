import baseSource from '../runtime/scenarios/cascade.plain.tsx?raw'
import memoSource from '../runtime/scenarios/cascade.memo.plain.tsx?raw'
import compilerSource from '../runtime/scenarios/cascade.plain.tsx?reactcompiler'
import contextSource from '../runtime/scenarios/context.plain.tsx?raw'
import contextPitfallSource from '../runtime/scenarios/context-pitfall.plain.tsx?raw'
import contextPitfallMemoSource from '../runtime/scenarios/context-pitfall.memo.plain.tsx?raw'
import compositionSource from '../runtime/scenarios/composition.plain.tsx?raw'
import compositionLiftSource from '../runtime/scenarios/composition.lift.plain.tsx?raw'
import identitySource from '../runtime/scenarios/identity.plain.tsx?raw'
import identityCallbackSource from '../runtime/scenarios/identity.callback.plain.tsx?raw'
import colocationSource from '../runtime/scenarios/colocation.plain.tsx?raw'
import colocationPushSource from '../runtime/scenarios/colocation.push.plain.tsx?raw'

// Display text (label/blurb/experiments/variant names) lives in src/i18n.ts,
// keyed by these ids. This file holds only the wiring: id → source code.
export interface Variant {
  id: string
  source: string
}

export interface Scenario {
  id: string
  source: string
  variants: Variant[]
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'cascade',
    source: baseSource,
    variants: [
      { id: 'memo', source: memoSource },
      { id: 'compiler', source: compilerSource },
    ],
  },
  { id: 'context', source: contextSource, variants: [] },
  {
    id: 'context-pitfall',
    source: contextPitfallSource,
    variants: [{ id: 'memo', source: contextPitfallMemoSource }],
  },
  {
    id: 'composition',
    source: compositionSource,
    variants: [{ id: 'lift', source: compositionLiftSource }],
  },
  {
    id: 'identity',
    source: identitySource,
    variants: [{ id: 'callback', source: identityCallbackSource }],
  },
  {
    id: 'colocation',
    source: colocationSource,
    variants: [{ id: 'push', source: colocationPushSource }],
  },
]

export const DEFAULT_SCENARIO = SCENARIOS[0].id

export const scenarioById = (id: string): Scenario => SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0]
