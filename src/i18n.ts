// Plain dictionary i18n — no library. A fixed string set for a single-page app
// doesn't need react-i18next; a typed object + the useT() hook is enough.
// `lang` lives in the store (persisted); useT() returns the active Dict.
// ponytail: hand-written catalogs, no ICU. Add a lib only if strings explode or
// translators need a non-code format.

import type { ReasonCode } from '../shared/protocol'

export type Lang = 'en' | 'de' | 'es'

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'de', label: 'Deutsch' },
  { id: 'es', label: 'Español' },
]

// Reason codes (runtime/track.tsx → shared/protocol) drive `reason()`, which
// interpolates the changed prop names for the `props` case.
interface ScenarioText {
  label: string
  blurb: string
  experiments: string[]
  variants: Record<string, string>
}

export interface Dict {
  brand: string
  tagline: string
  language: string
  status: { ready: string; error: string; connecting: string }
  wontCompile: string
  pane: { app: string; tree: string; why: string }
  resize: { app: string; why: string; editor: string }
  code: { head: string; hint: string }
  toolbar: {
    scenario: string
    hideCode: string
    editCode: string
    whatIf: string
    swapTo: (label: string) => string
    on: string
    off: string
    closeCompare: string
    compare: string
    compareTitle: string
    layers: string
    ownership: string
    props: string
    propsTitle: string
    context: string
    contextTitle: string
    replay: string
    instant: string
    slow: string
    replayBtn: string
    reset: string
  }
  why: {
    triggerMount: string
    triggerForced: (name: string) => string
    triggerState: (name: string) => string
    hideIntroTitle: string
    hideIntroAria: string
    tryThis: string
    interactHint: string
    rerendered: string
    changedDom: string
    skipped: string
    wasted: string
    clear: string
    renderNum: (n: number) => string
    changedProps: string
    notRerendered: string
    forceNode: string
    changedDomTag: string
    disclosure: string
  }
  compare: {
    sameAction: string
    memoOff: (n: number) => string
    memoOn: (n: number) => string
    clickHint: string
    memoOffCol: string
    memoOnCol: string
  }
  coach: { text: string; gotIt: string }
  tree: {
    waiting: string
    aria: string
    nodeAria: (name: string, count: number | null) => string
    /** Aria suffix describing the node's outcome in the latest commit. */
    nodeState: (rendered: boolean, committed: boolean) => string
    forceTitle: string
  }
  reason: (code: ReasonCode, propsChanged: string[]) => string
  scenarios: Record<string, ScenarioText>
}

const en: Dict = {
  brand: 'How React Renders',
  tagline: 'See exactly when components re-render — and why.',
  language: 'Language',
  status: { ready: 'live', error: 'error', connecting: 'connecting…' },
  wontCompile: 'won’t compile',
  pane: { app: 'Live app', tree: 'Component tree', why: 'Why' },
  resize: { app: 'Resize the live-app panel', why: 'Resize the why panel', editor: 'Resize the code editor' },
  code: { head: 'Code', hint: 'edits run live (your real React, instrumented)' },
  toolbar: {
    scenario: 'Scenario',
    hideCode: '✕ Hide code',
    editCode: '‹ › Edit code',
    whatIf: 'What-if',
    swapTo: (label) => `Swap to the ${label} version of this scenario`,
    on: 'on',
    off: 'off',
    closeCompare: '✕ Close compare',
    compare: '⇆ Compare',
    compareTitle: 'Run memo off and memo on side by side; one action drives both',
    layers: 'Layers',
    ownership: 'ownership',
    props: 'props',
    propsTitle: 'Highlight edges where a child received changed props',
    context: 'context',
    contextTitle: 'Draw context reach: provider → consumers, even past memoized middles',
    replay: 'Replay',
    instant: 'instant',
    slow: 'slow',
    replayBtn: 'replay',
    reset: 'reset',
  },
  why: {
    triggerMount: 'Initial mount',
    triggerForced: (name) => `You forced ${name} to re-render`,
    triggerState: (name) => `You changed state in ${name}`,
    hideIntroTitle: 'Hide this — I know how to use it',
    hideIntroAria: 'Hide the intro',
    tryThis: 'Try this',
    interactHint: 'Interact with the app to see what re-renders, and why.',
    rerendered: 're-rendered',
    changedDom: 'changed the DOM',
    skipped: 'skipped',
    wasted: 'wasted',
    clear: 'clear',
    renderNum: (n) => `render #${n}`,
    changedProps: 'changed props: ',
    notRerendered: 'Did not re-render in the last commit.',
    forceNode: '⚡ Force this node to re-render',
    changedDomTag: 'changed DOM',
    disclosure:
      'Running a tracked copy of real React — the code is genuine; we add invisible instrumentation to observe and poke renders.',
  },
  compare: {
    sameAction: 'Same action →',
    memoOff: (n) => `memo off: ${n} re-rendered`,
    memoOn: (n) => `memo on: ${n} re-rendered`,
    clickHint: 'Click a to-do (or any control) in either app — the same action drives both.',
    memoOffCol: 'memo off',
    memoOnCol: 'memo on',
  },
  coach: { text: 'Click any to-do and watch the tree light up.', gotIt: 'got it' },
  tree: {
    waiting: 'Waiting for the live app…',
    aria: 'Component tree — focus a node and press Enter to inspect it',
    nodeAria: (name, count) =>
      `${name}${count != null ? `, ${count} render${count === 1 ? '' : 's'}` : ''}`,
    nodeState: (rendered, committed) =>
      rendered ? `re-rendered${committed ? ', changed the DOM' : ''}` : 'skipped this commit',
    forceTitle: 'Force this component to re-render',
  },
  reason: (code, propsChanged) => {
    switch (code) {
      case 'mount-first':
        return 'Mounted for the first time.'
      case 'mount-new':
        return 'Mounted — a new instance was added to the tree.'
      case 'forced':
        return 'Forced to re-render — you poked this node directly.'
      case 'state-source':
        return 'State changed here — this is where the update starts.'
      case 'context':
        return 'Re-rendered because a context it reads changed — React re-renders consumers directly, even past memoized parents.'
      case 'props':
        return `Re-rendered because props changed: ${propsChanged.join(', ')}.`
      case 'wasted':
        return 'Re-rendered only because its parent did — its props are identical (wasted render).'
      case 'bailout':
        return 'Skipped (bailout) — memoized, and its props didn’t change.'
    }
  },
  scenarios: {
    cascade: {
      label: '1 · The default cascade',
      blurb: 'Parent state re-renders the whole subtree — props are irrelevant.',
      experiments: [
        'Toggle a to-do — every box flashes (re-render), but only one rings green (it changed the DOM).',
        'Flip React.memo or the React Compiler on, then toggle again — watch the cascade shrink.',
      ],
      variants: { memo: 'React.memo', compiler: 'React Compiler' },
    },
    context: {
      label: '2 · Context',
      blurb:
        'Every consumer re-renders when the context value changes — and React reaches them directly, skipping memoized middles.',
      experiments: [
        'Switch the theme — watch the flash jump OVER the gray (memoized) Sections to the consumers inside them.',
      ],
      variants: {},
    },
    'context-pitfall': {
      label: '3 · Context pitfall',
      blurb:
        'An inline object as the provider value is a new object every render — so even unrelated state re-renders every consumer.',
      experiments: [
        'Click "unrelated tick" — the themed consumers re-render even though the theme never changed.',
        'Flip "Memoized value" on, then tick again — now the consumers bail.',
      ],
      variants: { memo: 'Memoized value' },
    },
    composition: {
      label: '4 · Composition',
      blurb:
        'Content passed as children is created by the parent, so it doesn’t re-render when a wrapper’s own state changes.',
      experiments: [
        'Collapse/expand the Panel — the expensive content re-renders right along with it.',
        'Flip "Lift content up" on, then toggle again — the content bails (same element, made higher up).',
      ],
      variants: { lift: 'Lift content up' },
    },
    identity: {
      label: '5 · memo & referential identity',
      blurb:
        'memo only bails when its props are referentially equal — an inline handler is a new function every render, so memo can’t help.',
      experiments: [
        'Every child is wrapped in React.memo, yet flip the theme and the whole tree still flashes — the handlers are new each render.',
        'Switch on "Stable handlers", then flip the theme again — the list bails because useCallback kept the same function identity.',
      ],
      variants: { callback: 'Stable handlers' },
    },
    colocation: {
      label: '6 · Where state lives',
      blurb:
        'State placement sets the blast radius: a filter held at the top re-renders the whole app, even the parts that never read it.',
      experiments: [
        'Click a filter chip — Header, Toolbar and Footer all flash, though only the list cares about the filter.',
        'Switch on "Push state down", then filter again — only the list subtree re-renders. No memo required, just better placement.',
      ],
      variants: { push: 'Push state down' },
    },
  },
}

const de: Dict = {
  brand: 'How React Renders',
  tagline: 'Sieh genau, wann Komponenten neu rendern — und warum.',
  language: 'Sprache',
  status: { ready: 'live', error: 'Fehler', connecting: 'verbinde…' },
  wontCompile: 'kompiliert nicht',
  pane: { app: 'Live-App', tree: 'Komponentenbaum', why: 'Warum' },
  resize: {
    app: 'Größe des Live-App-Panels ändern',
    why: 'Größe des Warum-Panels ändern',
    editor: 'Größe des Code-Editors ändern',
  },
  code: { head: 'Code', hint: 'Änderungen laufen live (dein echtes React, instrumentiert)' },
  toolbar: {
    scenario: 'Szenario',
    hideCode: '✕ Code ausblenden',
    editCode: '‹ › Code bearbeiten',
    whatIf: 'Was-wäre-wenn',
    swapTo: (label) => `Zur ${label}-Variante dieses Szenarios wechseln`,
    on: 'an',
    off: 'aus',
    closeCompare: '✕ Vergleich schließen',
    compare: '⇆ Vergleichen',
    compareTitle: 'memo aus und memo an nebeneinander ausführen; eine Aktion steuert beide',
    layers: 'Ebenen',
    ownership: 'Besitz',
    props: 'Props',
    propsTitle: 'Kanten hervorheben, an denen ein Kind geänderte Props erhielt',
    context: 'Kontext',
    contextTitle: 'Kontext-Reichweite zeichnen: Provider → Consumer, auch über memoisierte Zwischenebenen',
    replay: 'Wiederholung',
    instant: 'sofort',
    slow: 'langsam',
    replayBtn: 'wiederholen',
    reset: 'zurücksetzen',
  },
  why: {
    triggerMount: 'Erstes Mounten',
    triggerForced: (name) => `Du hast ${name} zum Neu-Rendern gezwungen`,
    triggerState: (name) => `Du hast den State in ${name} geändert`,
    hideIntroTitle: 'Ausblenden — ich weiß, wie es funktioniert',
    hideIntroAria: 'Intro ausblenden',
    tryThis: 'Probier das',
    interactHint: 'Interagiere mit der App, um zu sehen, was neu rendert — und warum.',
    rerendered: 'neu gerendert',
    changedDom: 'haben das DOM geändert',
    skipped: 'übersprungen',
    wasted: 'verschwendet',
    clear: 'leeren',
    renderNum: (n) => `Render #${n}`,
    changedProps: 'geänderte Props: ',
    notRerendered: 'Im letzten Commit nicht neu gerendert.',
    forceNode: '⚡ Diesen Knoten zum Neu-Rendern zwingen',
    changedDomTag: 'DOM geändert',
    disclosure:
      'Läuft eine verfolgte Kopie von echtem React — der Code ist echt; wir fügen unsichtbare Instrumentierung hinzu, um Renders zu beobachten und anzustoßen.',
  },
  compare: {
    sameAction: 'Gleiche Aktion →',
    memoOff: (n) => `memo aus: ${n} neu gerendert`,
    memoOn: (n) => `memo an: ${n} neu gerendert`,
    clickHint: 'Klicke ein To-do (oder ein beliebiges Element) in einer der Apps — dieselbe Aktion steuert beide.',
    memoOffCol: 'memo aus',
    memoOnCol: 'memo an',
  },
  coach: { text: 'Klicke ein To-do und sieh zu, wie der Baum aufleuchtet.', gotIt: 'verstanden' },
  tree: {
    waiting: 'Warte auf die Live-App…',
    aria: 'Komponentenbaum — fokussiere einen Knoten und drücke Enter, um ihn zu inspizieren',
    nodeAria: (name, count) =>
      `${name}${count != null ? `, ${count} Render${count === 1 ? '' : 's'}` : ''}`,
    nodeState: (rendered, committed) =>
      rendered ? `neu gerendert${committed ? ', hat das DOM geändert' : ''}` : 'in diesem Commit übersprungen',
    forceTitle: 'Diese Komponente zum Neu-Rendern zwingen',
  },
  reason: (code, propsChanged) => {
    switch (code) {
      case 'mount-first':
        return 'Zum ersten Mal gemountet.'
      case 'mount-new':
        return 'Gemountet — eine neue Instanz wurde dem Baum hinzugefügt.'
      case 'forced':
        return 'Zum Neu-Rendern gezwungen — du hast diesen Knoten direkt angestoßen.'
      case 'state-source':
        return 'Hier hat sich der State geändert — hier beginnt das Update.'
      case 'context':
        return 'Neu gerendert, weil sich ein gelesener Kontext geändert hat — React rendert Consumer direkt neu, auch über memoisierte Eltern hinweg.'
      case 'props':
        return `Neu gerendert, weil sich Props geändert haben: ${propsChanged.join(', ')}.`
      case 'wasted':
        return 'Nur neu gerendert, weil das Elternteil es tat — die Props sind identisch (verschwendeter Render).'
      case 'bailout':
        return 'Übersprungen (Bailout) — memoisiert, und die Props haben sich nicht geändert.'
    }
  },
  scenarios: {
    cascade: {
      label: '1 · Die Standard-Kaskade',
      blurb: 'Eltern-State rendert den gesamten Teilbaum neu — Props sind irrelevant.',
      experiments: [
        'Schalte ein To-do um — jede Box blinkt (Render), aber nur eine leuchtet grün (sie hat das DOM geändert).',
        'Aktiviere React.memo oder den React Compiler und schalte erneut um — sieh zu, wie die Kaskade schrumpft.',
      ],
      variants: { memo: 'React.memo', compiler: 'React Compiler' },
    },
    context: {
      label: '2 · Kontext',
      blurb:
        'Jeder Consumer rendert neu, wenn sich der Kontextwert ändert — und React erreicht sie direkt, überspringt memoisierte Zwischenebenen.',
      experiments: [
        'Wechsle das Theme — sieh, wie das Blinken ÜBER die grauen (memoisierten) Sections zu den Consumern darin springt.',
      ],
      variants: {},
    },
    'context-pitfall': {
      label: '3 · Kontext-Falle',
      blurb:
        'Ein Inline-Objekt als Provider-Wert ist bei jedem Render ein neues Objekt — daher rendert sogar unzusammenhängender State jeden Consumer neu.',
      experiments: [
        'Klicke "unrelated tick" — die themenbezogenen Consumer rendern neu, obwohl sich das Theme nie geändert hat.',
        'Aktiviere "Memoisierter Wert" und ticke erneut — jetzt steigen die Consumer aus.',
      ],
      variants: { memo: 'Memoisierter Wert' },
    },
    composition: {
      label: '4 · Komposition',
      blurb:
        'Als children übergebener Inhalt wird vom Elternteil erstellt, daher rendert er nicht neu, wenn sich der eigene State eines Wrappers ändert.',
      experiments: [
        'Klappe das Panel ein/aus — der teure Inhalt rendert direkt mit neu.',
        'Aktiviere "Inhalt hochziehen" und schalte erneut um — der Inhalt steigt aus (gleiches Element, weiter oben erstellt).',
      ],
      variants: { lift: 'Inhalt hochziehen' },
    },
    identity: {
      label: '5 · memo & referenzielle Identität',
      blurb:
        'memo steigt nur aus, wenn seine Props referenziell gleich sind — ein Inline-Handler ist bei jedem Render eine neue Funktion, also kann memo nicht helfen.',
      experiments: [
        'Jedes Kind ist in React.memo gewickelt, doch wechsle das Theme und der ganze Baum blinkt weiter — die Handler sind bei jedem Render neu.',
        'Aktiviere "Stabile Handler" und wechsle das Theme erneut — die Liste steigt aus, weil useCallback dieselbe Funktionsidentität behielt.',
      ],
      variants: { callback: 'Stabile Handler' },
    },
    colocation: {
      label: '6 · Wo der State lebt',
      blurb:
        'Die Platzierung des State bestimmt den Wirkungsradius: ein Filter ganz oben rendert die ganze App neu, sogar die Teile, die ihn nie lesen.',
      experiments: [
        'Klicke einen Filter-Chip — Header, Toolbar und Footer blinken alle, obwohl nur die Liste den Filter braucht.',
        'Aktiviere "State nach unten schieben" und filtere erneut — nur der Listen-Teilbaum rendert neu. Kein memo nötig, nur bessere Platzierung.',
      ],
      variants: { push: 'State nach unten schieben' },
    },
  },
}

const es: Dict = {
  brand: 'How React Renders',
  tagline: 'Mira exactamente cuándo se re-renderizan los componentes — y por qué.',
  language: 'Idioma',
  status: { ready: 'en vivo', error: 'error', connecting: 'conectando…' },
  wontCompile: 'no compila',
  pane: { app: 'App en vivo', tree: 'Árbol de componentes', why: 'Por qué' },
  resize: {
    app: 'Redimensionar el panel de la app en vivo',
    why: 'Redimensionar el panel de por qué',
    editor: 'Redimensionar el editor de código',
  },
  code: { head: 'Código', hint: 'los cambios se ejecutan en vivo (tu React real, instrumentado)' },
  toolbar: {
    scenario: 'Escenario',
    hideCode: '✕ Ocultar código',
    editCode: '‹ › Editar código',
    whatIf: 'Qué pasaría si',
    swapTo: (label) => `Cambiar a la versión ${label} de este escenario`,
    on: 'sí',
    off: 'no',
    closeCompare: '✕ Cerrar comparación',
    compare: '⇆ Comparar',
    compareTitle: 'Ejecuta memo desactivado y memo activado en paralelo; una acción controla ambos',
    layers: 'Capas',
    ownership: 'propiedad',
    props: 'props',
    propsTitle: 'Resaltar aristas donde un hijo recibió props cambiadas',
    context: 'contexto',
    contextTitle: 'Dibujar el alcance del contexto: proveedor → consumidores, incluso a través de intermedios memoizados',
    replay: 'Reproducir',
    instant: 'instantáneo',
    slow: 'lento',
    replayBtn: 'reproducir',
    reset: 'reiniciar',
  },
  why: {
    triggerMount: 'Montaje inicial',
    triggerForced: (name) => `Forzaste el re-renderizado de ${name}`,
    triggerState: (name) => `Cambiaste el estado en ${name}`,
    hideIntroTitle: 'Ocultar esto — ya sé cómo usarlo',
    hideIntroAria: 'Ocultar la introducción',
    tryThis: 'Prueba esto',
    interactHint: 'Interactúa con la app para ver qué se re-renderiza, y por qué.',
    rerendered: 're-renderizados',
    changedDom: 'cambiaron el DOM',
    skipped: 'omitidos',
    wasted: 'desperdiciados',
    clear: 'limpiar',
    renderNum: (n) => `render n.º ${n}`,
    changedProps: 'props cambiadas: ',
    notRerendered: 'No se re-renderizó en el último commit.',
    forceNode: '⚡ Forzar el re-renderizado de este nodo',
    changedDomTag: 'cambió el DOM',
    disclosure:
      'Ejecutando una copia rastreada de React real — el código es auténtico; añadimos instrumentación invisible para observar y provocar renders.',
  },
  compare: {
    sameAction: 'Misma acción →',
    memoOff: (n) => `memo desactivado: ${n} re-renderizados`,
    memoOn: (n) => `memo activado: ${n} re-renderizados`,
    clickHint: 'Haz clic en una tarea (o cualquier control) en cualquiera de las apps — la misma acción controla ambas.',
    memoOffCol: 'memo desactivado',
    memoOnCol: 'memo activado',
  },
  coach: { text: 'Haz clic en cualquier tarea y mira cómo se ilumina el árbol.', gotIt: 'entendido' },
  tree: {
    waiting: 'Esperando la app en vivo…',
    aria: 'Árbol de componentes — enfoca un nodo y pulsa Enter para inspeccionarlo',
    nodeAria: (name, count) =>
      `${name}${count != null ? `, ${count} render${count === 1 ? '' : 's'}` : ''}`,
    nodeState: (rendered, committed) =>
      rendered ? `re-renderizado${committed ? ', cambió el DOM' : ''}` : 'omitido en este commit',
    forceTitle: 'Forzar el re-renderizado de este componente',
  },
  reason: (code, propsChanged) => {
    switch (code) {
      case 'mount-first':
        return 'Montado por primera vez.'
      case 'mount-new':
        return 'Montado — se añadió una nueva instancia al árbol.'
      case 'forced':
        return 'Forzado a re-renderizar — provocaste este nodo directamente.'
      case 'state-source':
        return 'El estado cambió aquí — aquí empieza la actualización.'
      case 'context':
        return 'Se re-renderizó porque cambió un contexto que lee — React re-renderiza los consumidores directamente, incluso pasando padres memoizados.'
      case 'props':
        return `Se re-renderizó porque cambiaron las props: ${propsChanged.join(', ')}.`
      case 'wasted':
        return 'Se re-renderizó solo porque su padre lo hizo — sus props son idénticas (render desperdiciado).'
      case 'bailout':
        return 'Omitido (bailout) — memoizado, y sus props no cambiaron.'
    }
  },
  scenarios: {
    cascade: {
      label: '1 · La cascada por defecto',
      blurb: 'El estado del padre re-renderiza todo el subárbol — las props son irrelevantes.',
      experiments: [
        'Alterna una tarea — cada caja parpadea (re-render), pero solo una se enmarca en verde (cambió el DOM).',
        'Activa React.memo o el React Compiler y alterna de nuevo — observa cómo se reduce la cascada.',
      ],
      variants: { memo: 'React.memo', compiler: 'React Compiler' },
    },
    context: {
      label: '2 · Contexto',
      blurb:
        'Cada consumidor se re-renderiza cuando cambia el valor del contexto — y React los alcanza directamente, saltándose los intermedios memoizados.',
      experiments: [
        'Cambia el tema — observa cómo el parpadeo salta POR ENCIMA de las Sections grises (memoizadas) hasta los consumidores dentro de ellas.',
      ],
      variants: {},
    },
    'context-pitfall': {
      label: '3 · Trampa del contexto',
      blurb:
        'Un objeto en línea como valor del proveedor es un objeto nuevo en cada render — así que incluso un estado no relacionado re-renderiza a cada consumidor.',
      experiments: [
        'Haz clic en "unrelated tick" — los consumidores con tema se re-renderizan aunque el tema nunca cambió.',
        'Activa "Valor memoizado" y haz tick de nuevo — ahora los consumidores se libran.',
      ],
      variants: { memo: 'Valor memoizado' },
    },
    composition: {
      label: '4 · Composición',
      blurb:
        'El contenido pasado como children lo crea el padre, así que no se re-renderiza cuando cambia el propio estado de un envoltorio.',
      experiments: [
        'Colapsa/expande el Panel — el contenido costoso se re-renderiza junto con él.',
        'Activa "Subir el contenido" y alterna de nuevo — el contenido se libra (mismo elemento, creado más arriba).',
      ],
      variants: { lift: 'Subir el contenido' },
    },
    identity: {
      label: '5 · memo e identidad referencial',
      blurb:
        'memo solo se libra cuando sus props son referencialmente iguales — un manejador en línea es una función nueva en cada render, así que memo no puede ayudar.',
      experiments: [
        'Cada hijo está envuelto en React.memo, pero cambia el tema y todo el árbol sigue parpadeando — los manejadores son nuevos en cada render.',
        'Activa "Manejadores estables" y cambia el tema de nuevo — la lista se libra porque useCallback mantuvo la misma identidad de función.',
      ],
      variants: { callback: 'Manejadores estables' },
    },
    colocation: {
      label: '6 · Dónde vive el estado',
      blurb:
        'La ubicación del estado define el radio de impacto: un filtro en lo más alto re-renderiza toda la app, incluso las partes que nunca lo leen.',
      experiments: [
        'Haz clic en un chip de filtro — Header, Toolbar y Footer parpadean todos, aunque solo a la lista le importa el filtro.',
        'Activa "Bajar el estado" y filtra de nuevo — solo se re-renderiza el subárbol de la lista. Sin memo, solo mejor ubicación.',
      ],
      variants: { push: 'Bajar el estado' },
    },
  },
}

export const messages: Record<Lang, Dict> = { en, de, es }

export function detectLang(): Lang {
  try {
    const stored = localStorage.getItem('rr-lang')
    if (stored === 'en' || stored === 'de' || stored === 'es') return stored
    const nav = navigator.language.slice(0, 2)
    if (nav === 'de' || nav === 'es') return nav
  } catch {
    /* ignore */
  }
  return 'en'
}
