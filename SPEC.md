# How React Renders — Project Spec

A public, open-source, interactive playground that shows — with real React, not animations of
opinions — exactly when components re-render, what actually touches the DOM, and how
memo / identity / context / the React Compiler change the picture.

Working title: **How React Renders** (domain: howreactrenders.dev / .com).

---

## 1. Audience & learning objective

**Primary audience:** intermediate React developers — people who write React daily but hold a
fuzzy render model (the "wrap everything in `useMemo` just in case" crowd).

**The mental-model upgrade they leave with:**
1. When does my component function re-run (and why).
2. A render is not a DOM update (render phase vs commit phase).
3. How memo, referential identity, composition, context, and the React Compiler change №1.

**Depth boundary:** real observable behavior + render-vs-commit. No Fiber/lanes internals in v1.

## 2. Product shape

**One big playground** (no chapters, no scrollytelling). Primary navigation is a **scenario
picker**; every scenario is the **same small realistic app** wired up differently, with relevant
toggles and 2–3 suggested experiments ("check off to-do #3 — predict what flashes").

**The reused app: a to-do list** (working title) — has theme switching, a filter, an add-todo
toolbar, and a list of todo items. One app users learn once; each scenario changes only the
*rendering treatment* applied to it (memo, context, compiler…), never the app itself. Chosen
because it flexes to all 8 scenarios: theme → context, TodoItem → memo/identity, Toolbar →
composition (children-as-props), filter state high vs low → cascade. The specific app can change
during build, but the "one reused app" rule is fixed.

**Code is editable from day one.** Scenarios are starter templates; users can modify the code
and watch the visualization respond to *their* version.

### Layout

```
┌──────────┬─────────────────────────┬─────────────┐
│ LIVE APP │ COMPONENT TREE          │ WHY PANEL   │
│ (real,   │ (flashes + badges +     │ (narrator)  │
│ clickable│  layered relation edges)│ ───────────│
│ iframe)  │ layers: [own][props][ctx]│ CODE panel │
├──────────┴─────────────────────────┴─────────────┤
│ scenario ▾ │ memo □ compiler □ │ ⏮ ⏯ replay 1×   │
└───────────────────────────────────────────────────┘
+ CodeMirror editor (collapsible panel/drawer)
```

- **One tree, layered edges** (not two side-by-side trees): relations are drawn ON the
  component tree as toggleable overlays — ownership (gray), props flow (blue), context reach
  (purple, dashed). Selecting a node lights up everything it depends on. Cause (edge) and
  effect (flash) share one geometry.
- **Live app panel** is the credibility proof: a real running app users click directly.
- **Why panel** is the teaching layer (see §4).

**First run (no auto-play):** the page opens on the basic-cascade scenario with a single
coach-mark — "Click any to-do and watch the tree light up." The user makes the first move; the
hint dismisses on first interaction (and is suppressed on return visits). The **code editor
starts collapsed** behind an "Edit code" button so a cold visitor sees three things (app, tree,
why), not four.

## 3. Engine: real React + record/replay

Scenarios run as **real React trees in a sandboxed iframe**, instrumented so every interaction
emits a structured **render log**. The tree visualization **replays** the log at adjustable
speed: instant / slow / step-through. Timeline phases: event → state updates → renders (in
order) → commit (DOM mutations) → effects. The live app commits in **real time** (always the
final, real result); the tree **replays how it got there** from the log — so in slow/step modes
the outcome is already on screen while the tree walks the path that produced it (app = outcome,
tree = how).

Not a simulator (a simulator is a claim about React; one wrong edge case kills credibility),
not live-flashes-only (a cascade resolves in <16ms — too fast to teach).

### Watching mechanism (locked)

The editor **always shows the user's authored source**. What actually runs is a lightly
**instrumented copy** of it, and the UI **discloses this plainly** ("we add invisible tracking
so you can see and poke the renders"). The honesty contract: code-you-see == code-you-wrote, and
we're transparent that a tracked copy is what executes — consistent with the compiler lesson,
which already shows a transformed version of your code and explains it.

Render/commit facts come from React's **official `<Profiler>` API** (public, supported) plus the
injected tracking — **never private fiber internals** (the fragility the engine decision
rejected). This survives React version bumps and the compiler. Forcing a single node to
re-render (the seed feature) needs the injected per-component switch — pure observation can't
poke, only watch.

### Visual semantics (locked)

| Signal | Meaning |
|---|---|
| Amber pulse + count badge | Component function ran (render) |
| Gray "bailed" marker | Explicitly shown bailout (memo / same-element) — absence isn't teachable |
| Green flash (live app) + thin green ring (tree node) | Real DOM mutation committed |
| Edge colors | ownership gray · props blue · context purple dashed |

- StrictMode **off** inside scenario instances (double-render would corrupt counts; can become
  its own scenario later).
- Every tree node offers **force update** (instrumentation injects a hidden state bump) and
  **select** (populates code/why panels).

## 4. Teaching layer: the live "why" narrator

After every interaction the why panel explains each node's outcome in plain language,
**derived from real instrumentation, generically** (no per-scenario hand annotation):

> "TodoList re-rendered because its parent re-rendered — its props never changed (wasted render)."
> "TodoItem 'Ship v1' skipped: React.memo, props identical."
> "Toolbar re-rendered because ThemeContext changed — note it skipped its memoized parent."

Derivation sources: per-key `Object.is` props diffing, tagged state setters (which component
initiated the update), wrapped `useContext` (subscription + value-change tracking), commit
boundaries (bailout = mounted instrument with no render event while parent rendered).

## 5. Compare UX

- **Default: toggle in place.** Flip memo, redo the click; why panel cites the previous run
  ("9 renders → 2").
- **Compare button** splits the **app + tree** into two columns (config A | config B), each a
  separate sandbox iframe with its own runtime; the why-panel shows the diff ("A: 9 renders,
  B: 2"). To guarantee identical input, compare-mode actions are issued from a **shared control**
  (a tree node / the control bar) and the shell **fans the same semantic action out to both**
  iframes — never by clicking inside one app. Same action, 9 flashes left, 2 right — the most
  persuasive frame for memo and compiler.

### Toggle semantics with editable code (locked)

- **Compiler toggle = compile-pipeline flag.** Valid on ANY code, including heavy edits —
  "your code, compiler on|off" compare always works. Compiled output shown in the code panel.
- **Memo / context-split toggles = template variant swaps.** Flipping one loads that variant's
  source into the editor (confirm if dirty). The code diff between variants is highlighted —
  the diff IS the lesson.
- Compare panes each pick: (any variant | my edit) × (compiler on | off).
- **Pipeline order:** authored source → *(compiler, if on)* → instrument → run. The compiled
  output shown in the code panel is the compiler's output of your **authored** code
  (pre-instrumentation), so it stays honest; tracking is injected **last** and is
  render-order-stable, so it can't change what the compiler did.

## 6. v1 scenarios (8)

1. **The default cascade** — parent state re-renders the whole subtree; props irrelevant.
2. **Render ≠ commit** — 12 functions re-ran, 1 text node changed (amber vs green).
3. **React.memo & prop identity** — memo works, then an inline object/function silently breaks
   it; props-diff shows exactly why.
4. **React Compiler** — the broken-memo scenarios with the compiler flag + compiled output.
5. **useMemo / useCallback** — stabilizing identities so memo works; when they're pointless.
6. **Composition** — children-as-props / lifting content up; state in a wrapper doesn't
   re-render stable children.
7. **Context basics** — every consumer re-renders on value change; propagation skips memoized
   middles (flash jumps over gray nodes).
8. **Context pitfalls** — inline provider value object; splitting state/dispatch contexts.

**Deferred (v2):** state colocation, keys/reconciliation, batching, StrictMode, external
stores, transitions/concurrent, prediction-quiz mode, React version picker (runtime is
iframe-isolated, so this slots in cleanly).

## 7. Architecture

```
┌─ Shell (Vite + React SPA) ──────────────────────────────┐
│  scenario picker · toggles · URL state                  │
│  ┌───────────┐ ┌──────────────┐ ┌────────────────────┐  │
│  │ CodeMirror │ │ SVG tree viz │ │ why narrator +     │  │
│  │ editor     │ │ (replay)     │ │ code/diff panel    │  │
│  └─────┬─────┘ └──────▲───────┘ └─────────▲──────────┘  │
│        │ source       │ render log         │ why facts  │
│  ┌─────▼───────────┐  │             ┌──────┴─────────┐  │
│  │ compile worker:  │ │             │ causality      │  │
│  │ Babel standalone │ │             │ engine         │  │
│  │ + react-compiler │ │             │ (log → facts)  │  │
│  │ + instrument     │ │             └────────────────┘  │
│  │   transform      │ │ postMessage                     │
│  └─────┬───────────┘  │                                 │
│        │ compiled JS  │                                 │
│  ┌─────▼──────────────┴─────────────────────────────┐   │
│  │ sandbox iframe: pinned React runtime · live app  │   │
│  │ tracking hooks · DOM-mutation observer ·         │   │
│  │ render-count circuit breaker                     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

- **Auto-instrumentation**: a Babel transform injects the tracking hook into every detected
  function component (reuse component-detection heuristics from react-refresh / react-compiler),
  wraps state setters and `useContext`, and adds the hidden force-update switch.
  **Function components + hooks only; no classes in v1.** The editor renders the *authored*
  source; the transformed source is what runs (disclosed in the UI). Commit/render boundaries
  come from the official `<Profiler>` API — **no `__REACT_DEVTOOLS_GLOBAL_HOOK__` / fiber
  walking**. The **tree shape** is reconstructed without fiber too: each instrumented component
  reads its parent's id from a React context and provides its own id to its subtree, so the real
  *mounted* parent-child tree (conditionals, lists and all) falls out of instrumentation alone.
- **Sandbox safety**: iframe isolation; circuit breaker aborts after N renders/sec with a
  friendly error overlay (setState-in-render etc.); compiler errors degrade gracefully to
  uncompiled output + message. **Unsupported code** (class components, or anything the transform
  can't instrument) still runs — it just appears as a muted, untracked node with a "not
  visualized yet (v1 = function components + hooks)" note, instead of erroring.
- **Pinned React in the iframe**, bundled locally (no CDN), decoupled from the shell's React.
  Target **React 19.x** runtime; **React Compiler 1.0 (stable)** for the compiler scenarios.
  Use the **development/profiling build** of react-dom so `Profiler.onRender` fires and error
  messages stay legible (the production build no-ops both).
- **URL-shareable state**: `?scenario=memo&compiler=1&...` — every interesting configuration is
  a link. **Edited code** is shareable too, packed into the URL hash with LZ-compression
  (lz-string, like the TS/Babel playgrounds); if it's too large to encode, fall back to a
  "copy code" action. The live edit also persists to **localStorage**, so a refresh never loses
  work.
- **DOM-mutation attribution** (powers render ≠ commit): a `MutationObserver` in the iframe maps
  each mutation to the nearest instrumented component (host nodes tagged with `data-rr-id`,
  walking up from the mutated node) — that's how a node earns the green "committed" ring while
  siblings that re-rendered but touched no DOM don't.

### Stack

Vite + React 19 + TypeScript · Tailwind · Motion (animations) · custom SVG tree with
d3-hierarchy layout (React Flow rejected: graph-generic, fights custom semantics) ·
CodeMirror 6 · Zustand · Babel standalone + babel-plugin-react-compiler in a web worker ·
static deploy.

### Known risks

| Risk | Mitigation |
|---|---|
| Instrument transform mis-detects components in arbitrary code | Reuse react-refresh/compiler heuristics; fixture test suite |
| Compiler-in-browser breakage across versions | Pin versions (official compiler playground proves the approach); graceful fallback |
| Bailout detection false positives | Derive from mounted-instrument registry + commit boundaries via Profiler |
| Tracking alters behavior | Tracking reads via refs + external log store; the **only** injected state is the per-node force-update updater, idle unless the user pokes a node |

## 8. Distribution

- **Open source (MIT) from the first commit** — the repo is part of the credibility story
  (anyone can audit that the viz observes real React) and the contribution path for scenarios.
- Hosting: Vercel or Cloudflare Pages free tier, preview deploys per PR.
- Analytics: cookieless (Cloudflare Web Analytics / GoatCounter) — no consent banner.
- **Visual language: minimal & editorial** — typography-forward, generous whitespace, calm,
  content-first, light default. The UI palette is restrained; the *only* saturated color is the
  visualization's strict semantic code (amber=render, green=commit, blue=props, purple=context).
  The shell recedes so the cascade is the one thing that draws the eye.
- Desktop-first. **Mobile = read-only explore mode**: live app + tree + why-panel stacked
  vertically, tap nodes/buttons to trigger renders and watch the cascade; the code editor and
  compare-split are hidden, with a "best on desktop for the full thing" note.
- A11y: keyboard-navigable tree, `prefers-reduced-motion` honored (replace pulses with badges).
- Launch channels: Show HN, r/reactjs, X.

## 9. Build order

Editing ships in v1, but the build sequence de-risks the engine first:

1. **Scaffold** — Vite + TS + Tailwind, public repo, CI deploy.
2. **Runtime core** — iframe runtime, tracking hook (hand-placed first), render-log protocol,
   SVG tree, flash replay. Hardcode scenario 1.
3. **Causality engine** — why narrator, props diffing, node select/force-update, edge layers.
4. **Compile pipeline** — worker, Babel, instrument transform (replaces hand-placed hooks),
   CodeMirror, circuit breaker. Templates become source strings.
5. **Variants & compare** — toggles, compiler flag, compiled-output panel, synced split mode.
6. **Content** — author all 8 scenarios + suggested experiments; URL state; replay polish.
7. **Ship** — landing/SEO/meta, analytics, a11y pass, launch.

**Launch posture: big-bang** — all 8 scenarios + full polish, then one loud launch
(Show HN / r/reactjs / X). The build order above still applies *internally*: get the engine and
a single end-to-end "tracer-bullet" scenario working first (steps 1–4) to de-risk the hard parts
before scaling to 8. Strongly advised even with a big-bang public reveal — a **private feedback
round** with a handful of React devs before the loud launch, to catch the confusing bits while
they're still cheap to fix.

## 10. Decision log

| Decision | Choice | Rejected alternatives |
|---|---|---|
| Audience | Intermediate React devs | beginners; internals-curious; all-levels-layered |
| Structure | One big playground | guided chapters; scrollytelling; reference+demos |
| Teaching layer | Live why-narrator + suggested experiments | tooltips only; static sidebar; quiz mode (→v2 candidate) |
| First run | Default scenario + one coach-mark, user clicks first; editor collapsed | auto-play demo; welcome modal |
| Tree display | One tree, layered relation edges | two synced trees; relations-on-demand |
| Engine | Real React + record/replay | live-flashes only; hand-built simulator; devtools-inline |
| Watching mechanism | Show authored code, run instrumented copy (disclosed) + official Profiler | peek private internals; static analysis; pure-peek (breaks force-update) |
| Compare | In-place toggles + synced Compare split | toggle-only; always side-by-side |
| Scenarios v1 | Core spine + identity toolbox + context pack (8) | structure extras (deferred) |
| Demo app | One realistic app (to-do list) reused across all scenarios | abstract labeled boxes; bespoke app per scenario |
| Code editing | Editable from day one | fixed-only v1; parameter knobs |
| Toggle semantics | Compiler=flag; others=variant swaps | AST-transforming user code; separate Lab/Sandbox modes |
| Shell stack | Vite + React SPA | Next static export; Astro islands |
| Distribution | OSS (MIT) day one + free static host + cookieless analytics | private-until-polished; closed source |
| Mobile | Read-only explore mode (tap to render; editor + compare hidden) | full responsive; desktop-only gate |
| Visual design | Minimal & editorial (typography-forward, calm, light default); strict semantic viz palette | friendly/playful; clean-technical/instrument |
| Launch scope | Big-bang: all 8 + full polish, one loud launch (engine-first internally; private beta advised) | soft-launch spine; tracer-bullet only |
| Name | How React Renders | Rerender Lab; decide-later |

## 11. Read-through pass (gaps reconciled)

A clean pass hardened the spec for build. Gaps were filled **inline** in the sections above —
pipeline order (§5), tree-shape derivation (§7), compare = two iframes + shared control (§5/§7),
DOM-mutation attribution (§7), dev/profiling build (§7), unsupported-code handling (§7),
edited-code share/persist (§7) — and one **contradiction** fixed: force-update injection vs. the
"zero extra state" risk line (§7). Defaults chosen during the pass — **flag if you'd prefer
otherwise**:

- **Compare splits both app + tree** (A | B), not the tree alone.
- **Unsupported code runs uninstrumented** (muted node + note), rather than blocking the editor.
- **Edited code is shareable** via compressed URL hash + localStorage persistence.
