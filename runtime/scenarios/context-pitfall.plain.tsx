import { createContext, memo, useContext, useState } from 'react'

// Scenario: Context pitfall. The provider value is an inline object literal, so
// it's a NEW object on every render of App — which means even an *unrelated*
// state change (the tick) hands every consumer a "new" context value and
// re-renders them, memo or not. The fix variant memoizes the value.

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

  // PITFALL: a fresh object literal every render. Bumping `count` doesn't touch
  // the theme, but the consumers still re-render — the value's identity changed.
  return (
    <SettingsContext.Provider value={{ theme }}>
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
