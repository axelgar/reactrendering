import { createRoot } from 'react-dom/client'
import { Host } from './host'
import './runtime.css'

// No StrictMode: its intentional double-render would corrupt render counts.
// The Host waits for compiled scenario code from the shell, then executes and
// renders it.
createRoot(document.getElementById('root')!).render(<Host />)
