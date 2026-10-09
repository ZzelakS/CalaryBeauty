import { useEffect, useRef, type ReactNode } from 'react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  variant?: 'drawer' | 'modal'
}

export function Drawer({ open, onClose, title, children, footer, variant = 'drawer' }: DrawerProps) {
  const dialogRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement as HTMLElement | null
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'Tab') {
        const items = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')
        if (!items?.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('is-locked')
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('is-locked')
      previousFocus?.focus()
    }
  }, [open, onClose])

  return (
    <div
      className={`fixed inset-0 z-[60] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-noir/45 backdrop-blur-sm transition-opacity duration-500 ease-atelier ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute flex flex-col border border-ink/10 bg-porcelain transition-transform duration-700 ease-atelier ${
          variant === 'modal'
            ? `left-1/2 top-1/2 max-h-[92svh] w-[calc(100%-2rem)] max-w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-lg ${open ? 'scale-100' : 'scale-95'}`
            : `right-0 top-0 h-full w-full max-w-[30rem] ${open ? 'translate-x-0' : 'translate-x-full'}`
        }`}
        // visibility keeps the closed drawer out of the tab order, but only
        // once it has finished sliding away
        style={{
          visibility: open ? 'visible' : 'hidden',
          transitionProperty: 'transform, visibility',
          // visibility is a discrete property — give it no duration, or it
          // flips halfway through the slide and swallows the focus call
          transitionDuration: '700ms, 0s',
          transitionDelay: open ? '0ms, 0ms' : '0ms, 700ms',
        }}
      >
        <header className="flex items-center justify-between border-b border-ink/10 px-6 py-5">
          <h2 className="hud text-mocha">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="nav-link hud"
            aria-label={`Close ${title.toLowerCase()}`}
          >
            Close
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer ? <footer className="border-t border-ink/10 p-6">{footer}</footer> : null}
      </aside>
    </div>
  )
}
