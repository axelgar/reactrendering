import { createContext, memo, useContext, useState } from 'react'

// Scenario: Context. The theme lives in a context. The Sections are memoized
// and DON'T read context, so they bail when the theme changes — but the
// ThemedChip inside each one DOES read context, so React re-renders it directly,
// reaching it *past* the gray (bailed) Section. The flash jumps over the middle.

type Theme = 'light' | 'dark'
const ThemeContext = createContext<Theme>('light')

const ThemedChip = ({ label }: { label: string }) => {
  const theme = useContext(ThemeContext)
  return <span className={`themed ${theme === 'dark' ? 'on' : ''}`}>{label} · {theme}</span>
}

// Memoized middle: stable props, no context — it bails on a theme change.
const Section = memo(({ title }: { title: string }) => (
  <section className="ctx-section">
    <h3>{title}</h3>
    <ThemedChip label="themed control" />
  </section>
))

const Toolbar = ({ onToggle }: { onToggle: () => void }) => (
  <div className="toolbar">
    <button className="primary" onClick={onToggle}>
      switch theme
    </button>
  </div>
)

export const App = () => {
  const [theme, setTheme] = useState<Theme>('light')
  return (
    <ThemeContext.Provider value={theme}>
      <div className={`app theme-${theme}`}>
        <header className="app-header">
          <h1>Theme via context</h1>
        </header>
        <Toolbar onToggle={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))} />
        <Section title="Sidebar" />
        <Section title="Content" />
      </div>
    </ThemeContext.Provider>
  )
}
