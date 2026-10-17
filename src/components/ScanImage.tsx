import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface ScanImageProps {
  src: string
  alt: string
  /** Stagger, in ms, so a grid resolves in sequence rather than all at once. */
  delay?: number
  duration?: number
  className?: string
}

/**
 * The card image is uncovered by a scan line rather than faded in: the reveal
 * is clipped to the line's position, so the picture appears to be surveyed into
 * existence. If the file is slow, the line parks at 92% and waits for it.
 */
export function ScanImage({ src, alt, delay = 0, duration = 1100, className = '' }: ScanImageProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const clipRef = useRef<HTMLDivElement | null>(null)
  const lineRef = useRef<HTMLDivElement | null>(null)
  const readoutRef = useRef<HTMLSpanElement | null>(null)
  const loadedRef = useRef(false)
  const [started, setStarted] = useState(false)
  const [done, setDone] = useState(false)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const node = wrapRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return
    if (reducedMotion) {
      setDone(true)
      return
    }

    let frame = 0
    const begin = performance.now() + delay

    const step = (now: number) => {
      // start just inside the frame so the line is visible on the first paint,
      // then hold short of the end until the file itself has arrived
      const raw = Math.max(0.04, (now - begin) / duration)
      const progress = loadedRef.current ? Math.min(1, raw) : Math.min(0.92, raw)

      if (clipRef.current) {
        clipRef.current.style.clipPath = `inset(0 0 ${(1 - progress) * 100}% 0)`
      }
      if (lineRef.current) {
        lineRef.current.style.top = `${progress * 100}%`
      }
      if (readoutRef.current) {
        readoutRef.current.textContent = `${Math.round(progress * 100)}`.padStart(2, '0')
      }

      if (progress >= 1) {
        setDone(true)
        return
      }
      frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [started, delay, duration, reducedMotion])

  return (
    <div ref={wrapRef} className={`scan-plate relative overflow-hidden ${className}`}>
      <div
        ref={clipRef}
        className="absolute inset-0"
        style={{ clipPath: reducedMotion ? 'none' : 'inset(0 0 100% 0)' }}
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => {
            loadedRef.current = true
          }}
          className="h-full w-full object-cover transition-transform duration-[1400ms] ease-atelier group-hover:scale-[1.04]"
        />
      </div>

      {!done && !reducedMotion && (
        <>
          <div aria-hidden="true" className="scan-grid absolute inset-0 opacity-80" />
          <div
            ref={lineRef}
            aria-hidden="true"
            className="scan-bar absolute inset-x-0 h-16 -translate-y-1/2"
            style={{ top: '0%' }}
          />
          <div aria-hidden="true" className="absolute inset-0">
            <span className="corner left-3 top-3 border-l border-t" />
            <span className="corner right-3 top-3 border-r border-t" />
            <span className="corner bottom-3 left-3 border-b border-l" />
            <span className="corner bottom-3 right-3 border-b border-r" />
          </div>
          <span
            aria-hidden="true"
            className="hud absolute bottom-3 left-1/2 -translate-x-1/2 text-signal/80"
          >
            scan <span ref={readoutRef}>00</span>
          </span>
        </>
      )}
    </div>
  )
}
