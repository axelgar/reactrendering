import { useState } from 'react'

// Scenario: Composition. Here the expensive content is rendered INLINE inside a
// stateful Panel, so it re-renders every time the Panel's own state changes —
// even though its content never changes. The "lift" variant passes it as
// children instead, and it bails.

const Content = () => (
  <div className="ctx-section">
    <h3>Expensive content</h3>
    <span className="themed">static — yet it re-renders with the Panel</span>
  </div>
)

const Panel = () => {
  const [open, setOpen] = useState(true)
  return (
    <div className="panel">
      <div className="toolbar">
        <button className="primary" onClick={() => setOpen((o) => !o)}>
          {open ? 'collapse' : 'expand'}
        </button>
      </div>
      {open && <p className="footer">panel body is open</p>}
      <Content />
    </div>
  )
}

export const App = () => (
  <div className="app">
    <header className="app-header">
      <h1>Composition</h1>
    </header>
    <Panel />
  </div>
)
