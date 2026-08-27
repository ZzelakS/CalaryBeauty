import { useReveal } from '@/hooks/useReveal'
import { ScanImage } from './ScanImage'

export function Atelier() {
  const { ref, shown } = useReveal<HTMLDivElement>()

  return (
    <section id="atelier" className="mx-auto max-w-[1440px] px-6 py-24 md:px-10 md:py-32">
      <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
        <div className="order-2 lg:order-1">
          <div ref={ref} className="reveal" data-shown={shown}>
            <p className="hud text-mocha">The studio</p>
            <h2 className="display mt-4 text-[clamp(2rem,5vw,3.5rem)]">
              We buy from four
              <br />
              suppliers. That is all.
            </h2>
            <div className="mt-7 max-w-lg space-y-5 text-[0.95rem] leading-relaxed text-mocha">
              <p>
                Every bundle is single donor, which is why the cuticle runs one direction and the
                hair does not knot at the nape after a month. We pay for that hair at a price the
                donor agreed to, and we can tell you which collection yours came from.
              </p>
              <p>
                Caps are sewn here in Baltimore by three of us who have been doing it for a decade
                between us. Nothing is finished by a machine, which is also why there are eight
                pieces and not eighty.
              </p>
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-ink/10 pt-8">
              {[
                { value: '4', label: 'Donor sources' },
                { value: '2wk', label: 'Build time' },
                { value: '6wk', label: 'Maintenance' },
              ].map((stat) => (
                <div key={stat.label}>
                  <dd className="display text-4xl text-gold">{stat.value}</dd>
                  <dt className="hud mt-2 text-mocha">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="order-1 grid grid-cols-2 gap-4 lg:order-2">
          <ScanImage
            src="/products/studio-1.jpg"
            alt="Hair laid out on the cutting table"
            className="aspect-[3/4] w-full"
          />
          <ScanImage
            src="/products/studio-2.jpg"
            alt="A cap being sewn to measurement"
            className="mt-10 aspect-[3/4] w-full"
            delay={220}
          />
        </div>
      </div>
    </section>
  )
}
