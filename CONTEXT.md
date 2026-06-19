# How React Renders — Context

Domain language for this React-rendering visualizer: a playground that runs real, instrumented React in a sandboxed iframe and shows when components re-render and why. This file names the concepts and the good seams between them. `SPEC.md` holds the full design and decision log.

## Language

### The visualization

**Scenario**:
One configuration of the single reused demo app (the to-do list), wired to teach one rendering lesson; carries its source, suggested experiments, and variants.
_Avoid_: example, demo, page.

**Variant**:
A swappable version of a Scenario's source that changes only the rendering treatment (memo on/off, compiler, lifted children).
_Avoid_: mode, option.

**Render Log**:
The stream of facts a Runtime reports about a commit — what rendered, what bailed, what committed, and why.
_Avoid_: events, trace.

**Commit Frame**:
Everything that happened in one React commit: its trigger, every component's outcome, and which components touched the DOM.
_Avoid_: snapshot, update.

**Why Narrator**:
The teaching layer that turns a Commit Frame into plain-language causality ("re-rendered because its parent did — props identical, wasted render").
_Avoid_: explainer, tooltip.

### The engine

**Runtime**:
One sandboxed iframe running real, instrumented React for a given source — the credibility proof the visualization observes.
_Avoid_: sandbox, player.

**Runtime Session**:
The shell-side module that owns one Runtime's whole lifecycle — it holds a Runtime Transport and a compile function, runs the debounced compile→run loop for a source, and reduces incoming Render Log messages into its Session State. Single mode has one; Compare Mode has two.
_Avoid_: connection, manager, controller, service.

**Runtime Transport**:
The seam over "move messages to and from one Runtime." The real adapter wraps an iframe (postMessage + a source-filtered listener); a fake adapter drives a Runtime Session in tests with no iframe.
_Avoid_: channel, bridge, socket.

**Session State**:
The render-log facts a Runtime Session currently holds — tree, context links, latest Commit Frame, history, ready, error. Produced only by the pure reducer.
_Avoid_: store, model.

**Instrumentation**:
The tracking the build/worker injects into authored source (wrapping components, swapping hooks) so a Runtime can report a Render Log without fiber walking.
_Avoid_: tracing, probes.

**Compare Mode**:
Two coordinated Runtime Sessions driven by one shared action (a click fanned to both), so the same interaction shows diverging Render Logs side by side.
_Avoid_: diff, split, A/B.

## Relationships

- A **Runtime Session** owns one **Runtime Transport** and produces one **Session State**.
- A **Runtime** reports a **Render Log**; each commit in it is a **Commit Frame**.
- The **Why Narrator** reads a **Commit Frame**; it does not compute causality — the **Runtime** does, via **Instrumentation**.
- A **Scenario** has zero or more **Variants**; selecting either feeds source to a **Runtime Session**.
- **Compare Mode** coordinates two **Runtime Sessions**.

## Example dialogue

> **Dev:** "When the editor changes, who recompiles — the store?"
> **Maintainer:** "No. The store holds view and edit intent; it hands source to the **Runtime Session**, which owns the compile→run loop and reduces the **Render Log** into its **Session State**. The store never touches the wire."
> **Dev:** "And Compare Mode?"
> **Maintainer:** "Two **Runtime Sessions**, one shared action. The click-mirroring is a Compare-only coordinator that reaches each iframe's document — the sessions don't know about each other."

## Flagged ambiguities

- "runtime" was used loosely for both the iframe and the tracking code. Resolved: **Runtime** = the iframe instance; **Instrumentation** = the injected tracking; **Runtime Session** = the shell-side module that drives one Runtime.
- "store" meant both the global Zustand store and per-runtime data. Resolved: the global store holds **view/edit intent** only; per-runtime render-log data is **Session State**, owned by a **Runtime Session**.
