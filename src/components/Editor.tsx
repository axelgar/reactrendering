import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { useStore } from '../store'

// CodeMirror editor for the (authored, plain-React) scenario source.
// Keystrokes flow one-way into the store. A variant swap bumps `sourceEpoch`,
// which we treat as the one signal to replace the whole document.
export function Editor() {
  const host = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const setSource = useStore((s) => s.setSource)
  const sourceEpoch = useStore((s) => s.sourceEpoch)

  useEffect(() => {
    if (!host.current) return
    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: useStore.getState().source,
        extensions: [
          basicSetup,
          javascript({ jsx: true, typescript: true }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) setSource(u.state.doc.toString())
          }),
          EditorView.theme({
            '&': { height: '100%' },
            '.cm-scroller': { fontFamily: 'var(--mono)', fontSize: '12.5px', lineHeight: '1.6' },
            '.cm-gutters': { background: 'transparent', border: 'none', color: 'var(--faint)' },
            '&.cm-focused': { outline: 'none' },
          }),
        ],
      }),
    })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [setSource])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const next = useStore.getState().source
    if (view.state.doc.toString() === next) return
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } })
  }, [sourceEpoch])

  return <div className="editor-host" ref={host} />
}
