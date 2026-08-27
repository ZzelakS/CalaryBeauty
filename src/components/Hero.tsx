import { useEffect, useRef, useState } from 'react'
import type { HeroScene } from '@/three/HeroScene'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { HeroPanel } from './HeroPanel'
import { ShaderButton } from './ShaderButton'

export function Hero() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const readoutRef = useRef<HTMLSpanElement | null>(null)
  const barRef = useRef<HTMLSpanElement | null>(null)
  const [settled, setSettled] = useState(false)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    let scene: HeroScene | null = null
    let cancelled = false

    // Three is ~600kB — keep it out of the critical path
    void import('@/three/HeroScene')
      .then(({ HeroScene: Scene }) => {
        if (cancelled) return
        scene = new Scene({
          canvas,
          container,
          reducedMotion,
          // written straight to the DOM — this fires every frame
          onProgress: (progress) => {
            const percent = Math.round(progress * 100)
            if (readoutRef.current) readoutRef.current.textContent = `${percent}`.padStart(3, '0')
            if (barRef.current) barRef.current.style.transform = `scaleX(${progress})`
          },
          onIntroComplete: () => setSettled(true),
        })
      })
      .catch(() => {
        // no WebGL, or the chunk failed — the section still reads as a hero
        if (!cancelled) setSettled(true)
      })

    return () => {
      cancelled = true
      scene?.dispose()
    }
  }, [reducedMotion])

  return (
    <section
      id="top"
      ref={containerRef}
      className="relative h-[100svh] min-h-[620px] w-full overflow-hidden"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />

      {/* light pooling, so the branch sits in a room rather than in space */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 78% 16%, rgba(232,180,92,0.30) 0%, rgba(251,246,239,0) 58%), radial-gradient(90% 70% at 10% 92%, rgba(234,220,198,0.85) 0%, rgba(251,246,239,0) 62%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-56"
        style={{ background: 'linear-gradient(to top, #FBF6EF 6%, rgba(251,246,239,0) 100%)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-full md:w-1/2"
        style={{
          background:
            'linear-gradient(105deg, rgba(251,246,239,0.72) 0%, rgba(251,246,239,0.3) 46%, rgba(251,246,239,0) 100%)',
        }}
      />

      {/* survey readout — the intro's instrument panel */}
      <div
        className={`pointer-events-none absolute right-6 top-24 z-10 text-right transition-opacity duration-1000 ease-atelier md:right-10 ${
          settled ? 'opacity-0' : 'opacity-100'
        }`}
        aria-hidden="true"
      >
        <p className="hud text-signal/80">Field scan</p>
        <p className="mt-2 font-mono text-4xl text-signal/90">
          <span ref={readoutRef}>000</span>
          <span className="text-signal/40">%</span>
        </p>
        <span className="mt-3 block h-px w-32 bg-signal/20">
          <span
            ref={barRef}
            className="block h-px w-32 origin-left bg-signal"
            style={{ transform: 'scaleX(0)' }}
          />
        </span>
        <p className="hud mt-3 text-ink/35">Mapping the branch</p>
      </div>

      <HeroPanel shown={settled} />

      {/* headline */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="mx-auto max-w-[1440px] px-6 pb-16 md:px-10 md:pb-20">
          <div
            className="reveal max-w-2xl"
            data-shown={settled}
            style={{ transitionDelay: '120ms' }}
          >
            <p className="hud text-mocha">Baltimore, Maryland · custom units &amp; installs</p>
            <h1 className="display mt-5 text-[clamp(2.75rem,8vw,6.5rem)]">
              Beauty crafted
              <br />
              <span className="italic">for every woman.</span>
            </h1>
            <p className="mt-6 max-w-md text-[0.95rem] leading-relaxed text-mocha">
              Single-donor units built on your measurements and installed in studio, plus the
              lashes, gloss and oil that keep the whole look together.
            </p>
            <div className="pointer-events-auto mt-9 flex flex-wrap items-center gap-3">
              <ShaderButton onClick={() => document.getElementById('collection')?.scrollIntoView()}>
                Shop the collection
              </ShaderButton>
              <ShaderButton
                tone="quiet"
                onClick={() => document.getElementById('fitting')?.scrollIntoView()}
              >
                Book an install
              </ShaderButton>
            </div>
          </div>
        </div>
      </div>

      <p
        className={`hud pointer-events-none absolute bottom-7 right-6 z-10 hidden text-right text-mocha/80 transition-opacity duration-1000 ease-atelier md:right-10 md:block lg:hidden ${
          settled ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {reducedMotion ? (
          'Scroll for the collection'
        ) : (
          <>
            Move to look around
            <br />
            <span className="text-signal">Reach for the butterfly</span>
          </>
        )}
      </p>
    </section>
  )
}
