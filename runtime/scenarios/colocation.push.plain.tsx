import { useState } from 'react'

interface Todo {
  id: string
  text: string
  done: boolean
}

const INITIAL: Todo[] = [
  { id: 't1', text: 'Change the filter', done: true },
  { id: 't2', text: 'Only this list flashes now', done: false },
  { id: 't3', text: 'The state moved down to where it matters', done: false },
]

const FILTERS = ['all', 'active', 'done'] as const
type Filter = (typeof FILTERS)[number]

const Header = () => (
  <header className="app-header">
    <h1>To-dos</h1>
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

const TodoItem = ({ todo }: { todo: Todo }) => (
  <li className="todo">
    <label>
      <input type="checkbox" checked={todo.done} readOnly />
      <span className={todo.done ? 'done' : ''}>{todo.text}</span>
    </label>
  </li>
)

// The filter state now lives HERE, next to the only components that read it.
// A filter change re-renders just this subtree — Header, Toolbar and Footer
// above it never see it, so they don't flash.
const FilteredTodos = ({ todos }: { todos: Todo[] }) => {
  const [filter, setFilter] = useState<Filter>('all')
  const visible = todos.filter((t) => (filter === 'all' ? true : filter === 'done' ? t.done : !t.done))
  return (
    <>
      <Filters filter={filter} onSet={setFilter} />
      <ul className="todo-list">
        {visible.map((t) => (
          <TodoItem key={t.id} todo={t} />
        ))}
      </ul>
    </>
  )
}

export const App = () => {
  const [todos, setTodos] = useState<Todo[]>(INITIAL)
  const add = () => setTodos((ts) => [...ts, { id: `t${ts.length + 1}`, text: `New task ${ts.length + 1}`, done: false }])

  return (
    <div className="app">
      <Header />
      <Branding />
      <Toolbar onAdd={add} />
      <FilteredTodos todos={todos} />
      <Footer count={todos.length} />
    </div>
  )
}
