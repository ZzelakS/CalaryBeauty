
import { useEffect, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { ShaderButton } from './ShaderButton'

const slides = [
  {
    src: '/images/hero-1.webp',
    alt: 'Luxury hair styling and beauty portrait',
  },
  {
    src: '/images/hero-2.webp',
    alt: 'Premium custom hair unit and elegant beauty styling',
  },
]

export function Hero() {
  const [activeSlide, setActiveSlide] = useState(0)
  const reducedMotion = useReducedMotion()


  useEffect(() => {
    if (reducedMotion) return

    const interval = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length)
    }, 6000)

    return () => window.clearInterval(interval)
  }, [reducedMotion])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
    })
  }

  const carousel = (
    <>
      {slides.map((slide, index) => (
        <div
          key={slide.src}
          className={`
            absolute inset-0
            transition-opacity duration-[1600ms] ease-in-out
            motion-reduce:transition-none
            ${
              activeSlide === index
                ? 'opacity-100'
                : 'opacity-0'
            }
          `}
          aria-hidden={activeSlide !== index}
        >
          <img
            src={slide.src}
            alt={activeSlide === index ? slide.alt : ''}
            className={`
              h-full w-full object-cover object-top
              md:object-center
              ${
                !reducedMotion && activeSlide === index
                  ? 'md:animate-[heroZoom_9s_ease-out_both]'
                  : ''
              }
            `}
            loading={index === 0 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'low'}
          />
        </div>
      ))}
    </>
  )

  const indicators = (
    <div
      className="flex items-center gap-3"
      role="group"
      aria-label="Hero carousel controls"
    >
      {slides.map((slide, index) => (
        <button
          key={slide.src}
          type="button"
          onClick={() => setActiveSlide(index)}
          aria-label={`Show slide ${index + 1}`}
          aria-pressed={activeSlide === index}
          className={`
            relative h-8 transition-all duration-500
            ${activeSlide === index ? 'w-12' : 'w-6'}
          `}
        >
          <span
            className={`
              absolute inset-x-0 top-1/2 h-[2px]
              -translate-y-1/2 transition-colors duration-500
              ${
                activeSlide === index
                  ? 'bg-signal'
                  : 'bg-mocha/25'
              }
            `}
          />
        </button>
      ))}

      <span className="hud ml-3 text-mocha/55">
        0{activeSlide + 1} / 0{slides.length}
      </span>
    </div>
  )

  return (
    <section
      id="top"
      className="relative isolate w-full overflow-hidden bg-[#FBF6EF]"
    >
      {/* =========================================
          MOBILE LAYOUT
          Image and content are separate blocks.
          Nothing overlays the image.
      ========================================= */}

      <div className="md:hidden">
        {/* Dedicated image area below navbar */}
        <div
          className="
            relative w-full overflow-hidden
            h-[min(72svh,620px)]
          "
        >
          {carousel}

          {/* Very soft fade at bottom of photography */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[12%]"
            style={{
              background:
                'linear-gradient(to bottom, transparent, #FBF6EF)',
            }}
          />
        </div>

        {/* Text begins entirely BELOW the image */}
        <div className="relative z-20 px-6 pb-16 pt-8">
          <p className="hud text-mocha">
            Baltimore, Maryland · custom units &amp; installs
          </p>

          <h1
            className="
              display mt-5
              text-[clamp(2.75rem,9vw,4.5rem)]
              leading-[1.06] tracking-[-0.035em]
            "
          >
            Beauty crafted
            <br />
            <span className="italic">
              for every woman.
            </span>
          </h1>

          <p className="mt-6 max-w-md text-[0.95rem] leading-[1.85] text-mocha">
            Single-donor units built on your measurements and
            installed in studio, plus the lashes, gloss and
            oil that keep the whole look together.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ShaderButton onClick={() => scrollTo('collection')}>
              Shop the collection
            </ShaderButton>

            <ShaderButton
              tone="quiet"
              onClick={() => scrollTo('fitting')}
            >
              Book an install
            </ShaderButton>
          </div>

          <div className="mt-9">{indicators}</div>
        </div>
      </div>

      {/* =========================================
          DESKTOP LAYOUT
          Navbar clearance is part of the layout.
      ========================================= */}

      <div
        className="
          relative hidden w-full md:block
          min-h-[760px] lg:min-h-[800px]
        "
      >
        {/* Background atmosphere */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background: `
              radial-gradient(
                ellipse at 85% 15%,
                rgba(232,180,92,0.13),
                transparent 55%
              ),
              radial-gradient(
                ellipse at 5% 95%,
                rgba(234,220,198,0.45),
                transparent 60%
              )
            `,
          }}
        />

        {/* Right-side carousel.
            Top is explicitly BELOW navbar. */}
        <div
          className="
            pointer-events-none absolute right-0 z-0
            w-[55%] lg:w-[52%] xl:w-[50%]
            overflow-hidden
          "
          style={{
            top: 0,
            bottom: '44px',
          }}
        >
          {carousel}

          {/* Left-edge fade into cream background */}
          <div
            aria-hidden="true"
            className="absolute inset-0 z-10"
            style={{
              background: `
                linear-gradient(
                  to right,
                  #FBF6EF 0%,
                  rgba(251,246,239,0.96) 8%,
                  rgba(251,246,239,0.72) 24%,
                  rgba(251,246,239,0.20) 46%,
                  transparent 72%
                )
              `,
            }}
          />

          {/* Blurred left-side boundary */}
          <div
            aria-hidden="true"
            className="absolute inset-0 z-10 backdrop-blur-[16px]"
            style={{
              maskImage: `
                linear-gradient(
                  to right,
                  black 0%,
                  rgba(0,0,0,0.5) 14%,
                  transparent 42%
                )
              `,
              WebkitMaskImage: `
                linear-gradient(
                  to right,
                  black 0%,
                  rgba(0,0,0,0.5) 14%,
                  transparent 42%
                )
              `,
            }}
          />

          {/* Bottom edge fade */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 z-10 h-[22%]"
            style={{
              background: `
                linear-gradient(
                  to bottom,
                  transparent,
                  rgba(251,246,239,0.25) 50%,
                  #FBF6EF 100%
                )
              `,
            }}
          />
        </div>

        {/* Left-side hero text */}
        <div
          className="
            relative z-20 mx-auto flex
            min-h-[680px] w-full max-w-[1440px]
            items-center px-10
            lg:px-16 xl:px-20
          "
        >
          <div className="w-full max-w-[660px]">
            <p className="hud text-mocha">
              Baltimore, Maryland · custom units &amp; installs
            </p>

            <h1
              className="
                display mt-7
                text-[clamp(3rem,6vw,6.5rem)]
                leading-[1.03] tracking-[-0.035em]
              "
            >
              Beauty crafted
              <br />
              <span className="italic">
                for every woman.
              </span>
            </h1>

            <p
              className="
                mt-8 max-w-[440px]
                text-base leading-[1.85] text-mocha
              "
            >
              Single-donor units built on your measurements
              and installed in studio, plus the lashes,
              gloss and oil that keep the whole look together.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <ShaderButton onClick={() => scrollTo('collection')}>
                Shop the collection
              </ShaderButton>

              <ShaderButton
                tone="quiet"
                onClick={() => scrollTo('fitting')}
              >
                Book an install
              </ShaderButton>
            </div>

            <div className="mt-14">{indicators}</div>
          </div>
        </div>

        {/* Decorative label */}
        <p
          className="
            hud pointer-events-none absolute
            bottom-8 right-10 z-20
            hidden text-right text-mocha/60 lg:block
          "
        >
          Thoughtfully made.
          <br />
          Beautifully worn.
        </p>
      </div>
    </section>
  )
}
