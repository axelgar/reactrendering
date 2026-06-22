import { memo, useCallback, useState } from 'react'

interface Todo {
  id: string
  text: string
  done: boolean
}

let uid = 100
const newId = () => `t${uid++}`

const INITIAL: Todo[] = [
  { id: 't1', text: 'Every child is wrapped in memo', done: true },
  { id: 't2', text: '…and the handlers are now stable', done: false },
  { id: 't3', text: 'So memo can finally bail', done: false },
]

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

export const App = () => {
  const [todos, setTodos] = useState<Todo[]>(INITIAL)
  const [theme, setTheme] = useState<string>('light')

  // useCallback keeps the same function identity across renders (empty deps = never
  // changes). Now the memo'd children see stable props and bail when nothing they
  // depend on changed — flip the theme and the list no longer flashes.
  const toggle = useCallback((id: string) => setTodos((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t))), [])
  const add = useCallback(() => setTodos((ts) => [...ts, { id: newId(), text: `New task ${ts.length + 1}`, done: false }]), [])
  const toggleTheme = useCallback(() => setTheme((th) => (th === 'light' ? 'dark' : 'light')), [])

  return (
    <div className={`app theme-${theme}`}>
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <Branding />
      <Toolbar onAdd={add} />
      <TodoList todos={todos} onToggle={toggle} />
      <Footer count={todos.length} />
    </div>
  )
}
