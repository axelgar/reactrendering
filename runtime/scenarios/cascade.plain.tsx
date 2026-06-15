import { useState } from 'react'

// Scenario 1 as PLAIN React — no track(), no useTrackedState. The instrument
// transform turns this into the same instrumented shape the hand-placed
// `cascade.tsx` has. Used to prove the transform reproduces the render log.
//
// Structurally identical to cascade.tsx on purpose, so the two render logs can
// be compared one-to-one.

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

const Header = ({ theme, onToggleTheme }: { theme: string; onToggleTheme: () => void }) => (
  <header className="app-header">
    <h1>To-dos</h1>
    <button className="ghost" onClick={onToggleTheme}>
      {theme === 'light' ? '☀' : '☾'} theme
    </button>
  </header>
)

const Branding = () => <p className="branding">real React · instrumented</p>

const Toolbar = ({ onAdd }: { onAdd: () => void }) => (
  <div className="toolbar">
    <button className="primary" onClick={onAdd}>
      + Add to-do
    </button>
  </div>
)

const Filters = ({ filter, onSet }: { filter: Filter; onSet: (f: Filter) => void }) => (
  <div className="filters">
    {FILTERS.map((f) => (
      <button key={f} className={f === filter ? 'chip active' : 'chip'} onClick={() => onSet(f)}>
        {f}
      </button>
    ))}
  </div>
)

const Footer = ({ count }: { count: number }) => <p className="footer">{count} to-dos total</p>

const TodoItem = ({ todo, onToggle }: { todo: Todo; onToggle: (id: string) => void }) => (
  <li className="todo">
    <label>
      <input type="checkbox" checked={todo.done} onChange={() => onToggle(todo.id)} />
      <span className={todo.done ? 'done' : ''}>{todo.text}</span>
    </label>
  </li>
)

const TodoList = ({ todos, onToggle }: { todos: Todo[]; onToggle: (id: string) => void }) => (
  <ul className="todo-list">
    {todos.map((t) => (
      <TodoItem key={t.id} todo={t} onToggle={onToggle} />
    ))}
  </ul>
)

export const Cascade = () => {
  const [todos, setTodos] = useState<Todo[]>(INITIAL)
  const [filter, setFilter] = useState<Filter>('all')
  const [theme, setTheme] = useState<string>('light')

  const toggle = (id: string) => setTodos((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  const add = () => setTodos((ts) => [...ts, { id: newId(), text: `New task ${ts.length + 1}`, done: false }])

  const visible = todos.filter((t) => (filter === 'all' ? true : filter === 'done' ? t.done : !t.done))

  return (
    <div className={`app theme-${theme}`}>
      <Header theme={theme} onToggleTheme={() => setTheme((th) => (th === 'light' ? 'dark' : 'light'))} />
      <Branding />
      <Toolbar onAdd={add} />
      <Filters filter={filter} onSet={setFilter} />
      <TodoList todos={visible} onToggle={toggle} />
      <Footer count={todos.length} />
    </div>
  )
}
