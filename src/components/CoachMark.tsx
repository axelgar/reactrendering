import { useEffect, useState } from 'react'
import { useStore, useT } from '../store'

const KEY = 'rr-coach-dismissed'

export function CoachMark() {
  const t = useT()
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
      <span>{t.coach.text}</span>
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
        {t.coach.gotIt}
      </button>
    </div>
  )
}
