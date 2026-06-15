import { useEffect, useState } from 'react'
import { useStore } from '../store'

const KEY = 'rr-coach-dismissed'

export function CoachMark() {
  const hasInteracted = useStore((s) => s.hasInteracted)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (hasInteracted && !dismissed) {
      try {
        localStorage.setItem(KEY, '1')
      } catch {
        /* ignore */
      }
      setDismissed(true)
    }
  }, [hasInteracted, dismissed])

  if (dismissed || hasInteracted) return null

  return (
    <div className="coach">
      <span>Click any to-do and watch the tree light up.</span>
      <button
        onClick={() => {
          try {
            localStorage.setItem(KEY, '1')
          } catch {
            /* ignore */
          }
          setDismissed(true)
        }}
      >
        got it
      </button>
    </div>
  )
}
