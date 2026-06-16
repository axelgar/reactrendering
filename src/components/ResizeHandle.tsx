import { useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'

interface ResizeHandleProps {
  orientation: 'vertical' | 'horizontal'
  ariaLabel: string
  className?: string
  style?: CSSProperties
  /** Drag began — capture the current size before deltas arrive. */
  onStart?: () => void
  /** Cumulative pixel delta from drag start (x for vertical handles, y for horizontal). */
  onDrag: (delta: number) => void
  onEnd?: () => void
  /** Keyboard nudge: +1 = ArrowRight/ArrowDown, -1 = ArrowLeft/ArrowUp. */
  onStep?: (dir: number) => void
  /** Double-click to reset to the default size. */
  onReset?: () => void
}

// A thin, accessible divider. Pointer capture keeps the drag glued to this
// element even when the cursor crosses an iframe (iframes otherwise swallow the
// pointer mid-drag). The parent owns the size math; this just emits deltas.
export function ResizeHandle({
  orientation,
  ariaLabel,
  className,
  style,
  onStart,
  onDrag,
  onEnd,
  onStep,
  onReset,
}: ResizeHandleProps) {
  const start = useRef(0)
  const dragging = useRef(false)
  const axis = (e: PointerEvent) => (orientation === 'vertical' ? e.clientX : e.clientY)

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    // Don't steal focus on a mouse grab — that would leave a :focus-visible ring
    // lingering after release. Keyboard users still focus the handle via Tab.
    e.preventDefault()
    dragging.current = true
    start.current = axis(e)
    e.currentTarget.setPointerCapture(e.pointerId)
    e.currentTarget.classList.add('active')
    document.body.classList.add('rr-resizing')
    document.body.style.cursor = orientation === 'vertical' ? 'col-resize' : 'row-resize'
    onStart?.()
  }

  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    onDrag(axis(e) - start.current)
  }

  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    dragging.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* capture may already be gone */
    }
    e.currentTarget.classList.remove('active')
    document.body.classList.remove('rr-resizing')
    document.body.style.cursor = ''
    onEnd?.()
  }

  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const fwd = orientation === 'vertical' ? 'ArrowRight' : 'ArrowDown'
    const back = orientation === 'vertical' ? 'ArrowLeft' : 'ArrowUp'
    if (e.key === fwd) {
      e.preventDefault()
      onStep?.(1)
    } else if (e.key === back) {
      e.preventDefault()
      onStep?.(-1)
    }
  }

  return (
    <div
      className={className}
      style={style}
      role="separator"
      aria-orientation={orientation}
      aria-label={ariaLabel}
      tabIndex={0}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onDoubleClick={() => onReset?.()}
      onKeyDown={key}
    />
  )
}
