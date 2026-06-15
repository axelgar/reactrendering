# How React Renders

An interactive, open-source playground that shows — with **real React**, not animations of
opinions — exactly when components re-render, what actually touches the DOM, and how
memo / identity / context / the React Compiler change the picture.

See [`SPEC.md`](./SPEC.md) for the full design and decision log.

## Status

Feature-complete and launch-ready (pending deploy). The full loop runs end-to-end —

```
edit → instrument → run (sandboxed iframe) → visualize (tree + flashes + commit rings) → narrate (why)
```

What works today:

- A real, instrumented React to-do app runs in a sandboxed iframe.
- Every interaction posts a causal **render log** to the shell.
- The component tree is reconstructed from instrumentation (no fiber walking) and **replays the
  cascade** as staggered amber flashes, with per-node render counts.
- A live **"why" narrator** explains each component's outcome (state source, new props, or a
  wasted render).
- Click any node to inspect it; **⚡ force** any node to re-render.
- **Live editing, end to end.** Edit the (plain React) source in the CodeMirror panel; it is
  compiled + auto-instrumented in a **Web Worker**, then executed in the iframe **from source**
  (imports resolved to the iframe's own React via a require-shim) — tree, flashes and narrator
  update live. The transform (`runtime/instrument/plugin.ts`) turns ordinary React into the
  instrumented shape, so authored code stays plain.
- **Failure modes are handled:** compile errors show a banner and keep the last good render;
  runtime errors and runaway render loops (a commit-rate **circuit breaker**) show a friendly
  overlay; editing back to valid code recovers.
- **Render ≠ commit.** A `MutationObserver` (with a net-change filter that ignores React's
  controlled-input bookkeeping) attributes real DOM changes to components, so a node that actually
  touched the DOM gets a **green commit ring** distinct from the amber re-render flash. Toggling a
  to-do shows *10 re-rendered · 1 changed the DOM*; toggling the theme shows *2 changed the DOM*.
- **memo, with bailout visualization.** A `React.memo` toggle swaps the live source to a memoized
  variant (the transform handles `memo(fn)` / `forwardRef(fn)`); the runtime detects **bailouts**
  (a mounted node whose parent re-rendered but it didn't) and greys them out, dashed. Flipping memo
  on drops a to-do toggle from *10 re-rendered* to *3 re-rendered · 7 skipped*.
- **Compare mode.** A split view runs *memo off* and *memo on* in two coordinated iframes; one
  real click is **mirrored** to the other app (structural-path matching), so a single action drives
  both and the trees diverge side by side — *"same action → 10 re-rendered · 3 re-rendered."*
- **React Compiler.** A "React Compiler" toggle shows the compiler's *actual output* of the plain
  scenario and runs it — *zero* hand-written `memo`/`useCallback`, yet the cascade drops from 10
  re-renders to ~5 with auto-memoized bailouts. The compiler runs at **build time in Node** (via a
  Vite `?reactcompiler` plugin), because its dependency tree fights the browser worker; its output
  is fed in as a scenario variant.
- **Multi-scenario picker + the Context scenario.** A real picker switches between named scenarios
  (`src/scenarios.ts`), each with its own starter code, blurb, and suggested experiments. The
  Context scenario instruments `useContext` so the narrator can say *"re-rendered because a context
  changed — even past memoized parents,"* and the tree shows it literally: a theme change bails the
  memoized `Section`s (gray) while the consumers *inside* them light up — the flash jumps over the
  middle.
- **Relation edge layers.** Toggleable overlays on the tree: **props** (blue) shows the props-flow
  relation (which components receive props), emphasizing edges where props changed; **context**
  (dashed purple) draws each provider→consumer link, discovered by instrumenting
  `createContext`/Provider rendering. In the Context scenario the purple edges bow straight from
  `App` to the consumers, visibly going *around* the memoized Sections.
- **Four scenarios**, each a plain-React A/B you can edit: the **default cascade** (memo + compiler
  variants), **context** (skip-the-memoized-middle), the **context pitfall** (inline provider value
  re-renders every consumer; with a `useMemo` fix), and **composition** (children-as-props bail when
  a wrapper's state changes; with a "lift content up" variant).
- **Launch-ready.** SEO + Open Graph / Twitter meta and a favicon (`index.html`, `public/`); an
  accessibility pass — the tree is keyboard-navigable (focus a node, Enter to inspect) with
  descriptive `aria-label`s, visible focus rings, and `prefers-reduced-motion` honored; and the
  toolbar wraps gracefully on narrow desktops.

Not yet wired: the useMemo/useCallback scenario; compiler in compare mode; trimming the ~3 MB
compile worker (it's a separate on-demand chunk, so it doesn't block first paint); and the actual
deploy + repo push.

## Develop

```bash
npm install
npm run dev      # shell on / , runtime iframe on /runtime.html
npm run build    # typecheck + production build
```

## Deploy

It's a static build (Vite multi-page) — `npm run build` emits `dist/` with `index.html` +
`runtime.html` and assets. Any static host works; Vercel and Cloudflare Pages auto-detect Vite
(build `npm run build`, output dir `dist`). No server, rewrites, or env vars needed.

Before launch: set an absolute `og:url` in `index.html` for the deployed domain (the social image
is `public/og.png`). The compile worker (`@babel/standalone`, ~3 MB) is a separate chunk loaded on
demand, so it doesn't block first paint.

## Architecture (one-liner)

`src/` is the shell (panels, tree viz, narrator, store). `runtime/` is the code that runs inside
the iframe (the `track()` instrumentation + scenario apps). `shared/protocol.ts` is the
postMessage contract between them. Two Vite entry points keep the iframe's React instance
decoupled from the shell's.
