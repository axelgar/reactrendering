import { memo, useState } from 'react'

interface Todo {
  id: string
  text: string
  done: boolean
}

let uid = 100
const newId = () => `t${uid++}`

const INITIAL: Todo[] = [
  { id: 't1', text: 'Every child is wrapped in memo', done: true },
  { id: 't2', text: '…yet the whole tree still flashes', done: false },
  { id: 't3', text: 'The handlers are new every render', done: false },
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

  // Defined inline in render: a brand-new function on every render. Every memo'd
  // child sees a prop whose identity changed, so memo can't bail — the cascade returns.
  const toggle = (id: string) => setTodos((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  const add = () => setTodos((ts) => [...ts, { id: newId(), text: `New task ${ts.length + 1}`, done: false }])
  const toggleTheme = () => setTheme((th) => (th === 'light' ? 'dark' : 'light'))

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
