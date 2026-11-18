import { createPortal } from 'react-dom'
import { useEffect, useRef, type ReactNode } from 'react'

export function Lightbox({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const node = ref.current
    if (!node || !open) return
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    node.showModal()
    document.body.style.overflow = 'hidden'
    return () => { node.close(); document.body.style.overflow = overflow; previous?.focus() }
  }, [open])
  return createPortal(<dialog ref={ref} aria-label={title} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose() } }} onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }} className="lightbox w-[calc(100%-2rem)] max-w-3xl rounded-lg bg-porcelain p-0 text-ink shadow-2xl">
    <div className="flex items-center justify-between gap-4 border-b border-ink/10 px-6 py-5"><h2 className="display text-2xl">{title}</h2><button type="button" onClick={onClose} aria-label={`Close ${title}`} className="border border-ink/20 px-4 py-2">Close ×</button></div>
    <div className="max-h-[75svh] overflow-y-auto overscroll-contain p-6">{children}</div>
  </dialog>, document.body)
}
