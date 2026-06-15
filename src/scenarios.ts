import baseSource from '../runtime/scenarios/cascade.plain.tsx?raw'
import memoSource from '../runtime/scenarios/cascade.memo.plain.tsx?raw'
import compilerSource from '../runtime/scenarios/cascade.plain.tsx?reactcompiler'
import contextSource from '../runtime/scenarios/context.plain.tsx?raw'
import contextPitfallSource from '../runtime/scenarios/context-pitfall.plain.tsx?raw'
import contextPitfallMemoSource from '../runtime/scenarios/context-pitfall.memo.plain.tsx?raw'
import compositionSource from '../runtime/scenarios/composition.plain.tsx?raw'
import compositionLiftSource from '../runtime/scenarios/composition.lift.plain.tsx?raw'

export interface Variant {
  id: string
  label: string
  source: string
}

export interface Scenario {
  id: string
  label: string
  blurb: string
  experiments: string[]
  source: string
  variants: Variant[]
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'cascade',
    label: '1 · The default cascade',
    blurb: 'Parent state re-renders the whole subtree — props are irrelevant.',
    experiments: [
      'Toggle a to-do — every box flashes (re-render), but only one rings green (it changed the DOM).',
      'Flip React.memo or the React Compiler on, then toggle again — watch the cascade shrink.',
    ],
    source: baseSource,
    variants: [
      { id: 'memo', label: 'React.memo', source: memoSource },
      { id: 'compiler', label: 'React Compiler', source: compilerSource },
    ],
  },
  {
    id: 'context',
    label: '2 · Context',
    blurb:
      'Every consumer re-renders when the context value changes — and React reaches them directly, skipping memoized middles.',
    experiments: [
      'Switch the theme — watch the flash jump OVER the gray (memoized) Sections to the consumers inside them.',
    ],
    source: contextSource,
    variants: [],
  },
  {
    id: 'context-pitfall',
    label: '3 · Context pitfall',
    blurb:
      'An inline object as the provider value is a new object every render — so even unrelated state re-renders every consumer.',
    experiments: [
      'Click "unrelated tick" — the themed consumers re-render even though the theme never changed.',
      'Flip "Memoized value" on, then tick again — now the consumers bail.',
    ],
    source: contextPitfallSource,
    variants: [{ id: 'memo', label: 'Memoized value', source: contextPitfallMemoSource }],
  },
  {
    id: 'composition',
    label: '4 · Composition',
    blurb:
      'Content passed as children is created by the parent, so it doesn’t re-render when a wrapper’s own state changes.',
    experiments: [
      'Collapse/expand the Panel — the expensive content re-renders right along with it.',
      'Flip "Lift content up" on, then toggle again — the content bails (same element, made higher up).',
    ],
    source: compositionSource,
    variants: [{ id: 'lift', label: 'Lift content up', source: compositionLiftSource }],
  },
]

export const DEFAULT_SCENARIO = SCENARIOS[0].id

export const scenarioById = (id: string): Scenario => SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0]
