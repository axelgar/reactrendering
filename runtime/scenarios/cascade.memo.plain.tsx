import { memo, useCallback, useState } from 'react'

// Scenario 1, "memo" variant. Same app as cascade.plain.tsx, but every leaf is
// wrapped in React.memo and the handlers are stabilized with useCallback. Now
// toggling one to-do bails the components whose props didn't change — the
// cascade shrinks from 10 re-renders to 3. The diff vs the base variant IS the
// lesson.

interface Todo {
  id: string
  text: string
  done: boolean
}

let uid = 100
const newId = () => `t${uid++}`

const INITIAL: Todo[] = [
  { id: 't1', text: 'Read the render log', done: true },
  { id: 't2', text: 'Toggle a to-do', done: false },
  { id: 't3', text: 'Watch the cascade', done: false },
]

const FILTERS = ['all', 'active', 'done'] as const
type Filter = (typeof FILTERS)[number]

const Header = memo(({ theme, onToggleTheme }: { theme: string; onToggleTheme: () => void }) => (
  <header className="app-header">
    <h1>To-dos</h1>
    <button className="ghost" onClick={onToggleTheme}>
      {theme === 'light' ? '☀' : '☾'} theme
    </button>
  </header>
))

const Branding = memo(() => <p className="branding">real React · instrumented</p>)

const Toolbar = memo(({ onAdd }: { onAdd: () => void }) => (
  <div className="toolbar">
    <button className="primary" onClick={onAdd}>
      + Add to-do
    </button>
  </div>
))

const Filters = memo(({ filter, onSet }: { filter: Filter; onSet: (f: Filter) => void }) => (
  <div className="filters">
    {FILTERS.map((f) => (
      <button key={f} className={f === filter ? 'chip active' : 'chip'} onClick={() => onSet(f)}>
        {f}
      </button>
    ))}
  </div>
))

const Footer = memo(({ count }: { count: number }) => <p className="footer">{count} to-dos total</p>)

const TodoItem = memo(({ todo, onToggle }: { todo: Todo; onToggle: (id: string) => void }) => (
  <li className="todo">
    <label>
      <input type="checkbox" checked={todo.done} onChange={() => onToggle(todo.id)} />
      <span className={todo.done ? 'done' : ''}>{todo.text}</span>
    </label>
  </li>
))

const TodoList = memo(({ todos, onToggle }: { todos: Todo[]; onToggle: (id: string) => void }) => (
  <ul className="todo-list">
    {todos.map((t) => (
      <TodoItem key={t.id} todo={t} onToggle={onToggle} />
    ))}
  </ul>
))

export const Cascade = () => {
  const [todos, setTodos] = useState<Todo[]>(INITIAL)
  const [filter, setFilter] = useState<Filter>('all')
  const [theme, setTheme] = useState<string>('light')

  const toggle = useCallback((id: string) => setTodos((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t))), [])
  const add = useCallback(() => setTodos((ts) => [...ts, { id: newId(), text: `New task ${ts.length + 1}`, done: false }]), [])
  const toggleTheme = useCallback(() => setTheme((th) => (th === 'light' ? 'dark' : 'light')), [])

  const visible = todos.filter((t) => (filter === 'all' ? true : filter === 'done' ? t.done : !t.done))

  return (
    <div className={`app theme-${theme}`}>
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <Branding />
      <Toolbar onAdd={add} />
      <Filters filter={filter} onSet={setFilter} />
      <TodoList todos={visible} onToggle={toggle} />
      <Footer count={todos.length} />
    </div>
  )
}
