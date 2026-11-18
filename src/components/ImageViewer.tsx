import { createPortal } from 'react-dom'
import { useEffect, useRef } from 'react'

interface ImageViewerProps {
  open: boolean
  photos: string[]
  name: string
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
}

export function ImageViewer({ open, photos, name, index, onIndexChange, onClose }: ImageViewerProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const gesture = useRef<{ x: number; y: number; id: number } | null>(null)
  const current = Math.max(0, Math.min(index, photos.length - 1))
  const navigate = (step: number) => {
    if (photos.length > 1) onIndexChange((current + step + photos.length) % photos.length)
  }

  useEffect(() => {
    const node = dialog.current
    if (!open || !node || !photos.length) return
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    node.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      node.close()
      document.body.style.overflow = overflow
      if (previous?.isConnected) previous.focus({ preventScroll: true })
      gesture.current = null
    }
  }, [open, photos.length])

  return createPortal(
    <dialog
      ref={dialog}
      aria-label={`${name} image viewer`}
      className="image-viewer"
      onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose() }}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose() }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault(); event.stopPropagation(); navigate(event.key === 'ArrowRight' ? 1 : -1)
        }
      }}
    >
      <div
        className="image-viewer-stage"
        onPointerDown={event => {
          if (event.pointerType !== 'touch' || !event.isPrimary) { gesture.current = null; return }
          gesture.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerUp={event => {
          const start = gesture.current
          gesture.current = null
          if (!start || start.id !== event.pointerId) return
          const dx = event.clientX - start.x, dy = event.clientY - start.y
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) navigate(dx < 0 ? 1 : -1)
        }}
        onPointerCancel={() => { gesture.current = null }}
      >
        {photos[current] && <img src={photos[current]} alt={`${name}, photo ${current + 1} of ${photos.length}`} className="image-viewer-photo" draggable={false} />}
      </div>
      <button type="button" autoFocus aria-label="Close image viewer" onClick={onClose} className="image-viewer-control image-viewer-close">×</button>
      {photos.length > 1 && <>
        <button type="button" aria-label="Previous image" onClick={() => navigate(-1)} className="image-viewer-control image-viewer-previous">‹</button>
        <button type="button" aria-label="Next image" onClick={() => navigate(1)} className="image-viewer-control image-viewer-next">›</button>
      </>}
      <span className="sr-only" aria-live="polite">Photo {current + 1} of {photos.length}</span>
    </dialog>, document.body,
  )
}
