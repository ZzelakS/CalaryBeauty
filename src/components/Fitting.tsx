import { useReveal } from '@/hooks/useReveal'
import { ShaderButton } from './ShaderButton'

const steps = [
  {
    step: '01',
    title: 'Consult',
    body: 'Twenty minutes in the studio. Circumference, nape to front, ear to ear, and a photo of your hairline so the knots are bleached to your scalp tone rather than an average one.',
    time: 'Day one',
  },
  {
    step: '02',
    title: 'Build',
    body: 'The cap is sewn to your measurements and the unit is cut on you, dry, in the light you actually live in. You leave wearing it.',
    time: 'Two weeks',
  },
  {
    step: '03',
    title: 'Maintain',
    body: 'A wash schedule written for your texture, and a standing appointment every six weeks to re-bleach knots, tighten the band and refresh the install.',
    time: 'Every six weeks',
  },
]

export function Fitting() {
  const { ref, shown } = useReveal<HTMLDivElement>()

  return (
    <section id="fitting" className="border-y border-ink/10 bg-sand/45">
      <div className="mx-auto max-w-[1440px] px-6 py-24 md:px-10 md:py-32">
        <div ref={ref} className="reveal max-w-2xl" data-shown={shown}>
          <p className="hud text-mocha">The install</p>
          <h2 className="display mt-4 text-[clamp(2rem,5vw,3.5rem)]">
            A unit is a measurement
            <br />
            before it is a look.
          </h2>
          <p className="mt-5 max-w-lg text-[0.95rem] leading-relaxed text-mocha">
            Three appointments over two weeks. If a piece is wrong for your face or your routine,
            we will say so before you pay for it.
          </p>
        </div>

        <ol className="mt-16 grid gap-px border border-ink/10 bg-ink/10 md:grid-cols-3">
          {steps.map((item) => (
            <li key={item.step} className="bg-porcelain p-8 md:p-10">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-xs text-gold">{item.step}</span>
                <span className="hud text-mocha/70">{item.time}</span>
              </div>
              <h3 className="display mt-8 text-3xl">{item.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-mocha">{item.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12">
          <ShaderButton
            onClick={() => document.getElementById('visit')?.scrollIntoView()}
          >
            Book an install
          </ShaderButton>
        </div>
      </div>
    </section>
  )
}
