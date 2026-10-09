import { useEffect, useRef, useState } from 'react'
import { imageUrl } from '@/lib/imagekit'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface ProductGalleryProps {
  photos: string[]
  name: string
  open: boolean
}

export function ProductGallery({ photos, name, open }: ProductGalleryProps) {
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const reducedMotion = useReducedMotion()
  const photoKey = JSON.stringify(photos)

  useEffect(() => {
    setActive(0)
    if (track.current) track.current.scrollLeft = 0
  }, [photoKey, open])

  const goTo = (index: number) => {
    const node = track.current
    if (!node) return
    const next = Math.max(0, Math.min(index, photos.length - 1))
    node.scrollTo({ left: next * node.clientWidth, behavior: reducedMotion ? 'auto' : 'smooth' })
  }

  return (
    <div className="relative">
      <div
        ref={track}
        role="region"
        aria-label={`${name} photo gallery`}
        tabIndex={0}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        onScroll={() => {
          const node = track.current
          if (node?.clientWidth) setActive(Math.round(node.scrollLeft / node.clientWidth))
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault()
            goTo(active + (event.key === 'ArrowRight' ? 1 : -1))
          }
        }}
      >
        {photos.map((photo, index) => (
          <div key={`${photo}-${index}`} className="h-[45svh] min-h-[240px] w-full shrink-0 snap-center bg-linen sm:h-[50svh]">
            <img
              src={imageUrl(photo, 960, 1200)}
              alt={`${name} — photo ${index + 1} of ${photos.length}`}
              className="h-full w-full object-contain"
              loading={index === 0 ? 'eager' : 'lazy'}
              draggable={false}
            />
          </div>
        ))}
      </div>
      {photos.length > 1 && (
        <>
          <div className="flex items-center justify-between px-6 pt-4">
            <button type="button" onClick={() => goTo(active - 1)} disabled={active === 0} aria-label="Previous photo" className="hud border border-ink/20 px-3 py-2 disabled:opacity-30">← Previous</button>
            <p className="hud text-mocha" aria-live="polite">{active + 1} / {photos.length}</p>
            <button type="button" onClick={() => goTo(active + 1)} disabled={active === photos.length - 1} aria-label="Next photo" className="hud border border-ink/20 px-3 py-2 disabled:opacity-30">Next →</button>
          </div>
          <p className="mt-3 px-6 text-center text-xs text-mocha">Swipe or scroll sideways to browse photos.</p>
          <div className="flex gap-2 overflow-x-auto px-6 pt-4" aria-label="Choose a product photo">
            {photos.map((photo, index) => (
              <button key={`${photo}-${index}`} type="button" onClick={() => goTo(index)} aria-label={`View photo ${index + 1}`} aria-pressed={active === index} className={`shrink-0 border p-1 ${active === index ? 'border-gold' : 'border-ink/20'}`}>
                <img src={imageUrl(photo, 96, 120)} alt="" className="h-16 w-12 object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
