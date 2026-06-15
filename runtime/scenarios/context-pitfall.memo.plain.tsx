import { createContext, memo, useContext, useMemo, useState } from 'react'

// Context pitfall — FIXED. The provider value is wrapped in useMemo, so its
// identity is stable unless `theme` actually changes. Now an unrelated tick
// re-renders App but the consumers bail.

interface Settings {
  theme: 'light' | 'dark'
}
const SettingsContext = createContext<Settings>({ theme: 'light' })

const ThemedLabel = memo(({ name }: { name: string }) => {
  const { theme } = useContext(SettingsContext)
  return (
    <div className="ctx-section">
      <h3>{name}</h3>
      <span className={`themed ${theme === 'dark' ? 'on' : ''}`}>theme · {theme}</span>
    </div>
  )
})

const Toolbar = ({ count, onTick, onTheme }: { count: number; onTick: () => void; onTheme: () => void }) => (
  <div className="toolbar">
    <button className="primary" onClick={onTick}>
      unrelated tick · {count}
    </button>
    <button className="ghost" onClick={onTheme}>
      switch theme
    </button>
  </div>
)

export const App = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [count, setCount] = useState(0)

  // FIX: stable identity unless theme changes — ticking no longer re-renders consumers.
  const value = useMemo(() => ({ theme }), [theme])

  return (
    <SettingsContext.Provider value={value}>
      <div className={`app theme-${theme}`}>
        <header className="app-header">
          <h1>Context pitfall</h1>
        </header>
        <Toolbar
          count={count}
          onTick={() => setCount((c) => c + 1)}
          onTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
        />
        <ThemedLabel name="Sidebar" />
        <ThemedLabel name="Content" />
      </div>
    </SettingsContext.Provider>
  )
}
