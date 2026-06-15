import { useState, type ReactNode } from 'react'

// Composition — LIFTED. The expensive content is created in App and passed to
// Panel as `children`. Since App doesn't re-render when the Panel toggles, the
// child is the SAME element — so React bails it. Toggle the Panel and watch the
// content go gray instead of flashing.

const Content = () => (
  <div className="ctx-section">
    <h3>Expensive content</h3>
    <span className="themed">created in App — it bails on toggle</span>
  </div>
)

const Panel = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(true)
  return (
    <div className="panel">
      <div className="toolbar">
        <button className="primary" onClick={() => setOpen((o) => !o)}>
          {open ? 'collapse' : 'expand'}
        </button>
      </div>
      {open && <p className="footer">panel body is open</p>}
      {children}
    </div>
  )
}

export const App = () => (
  <div className="app">
    <header className="app-header">
      <h1>Composition</h1>
    </header>
    <Panel>
      <Content />
    </Panel>
  </div>
)
