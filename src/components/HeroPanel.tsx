import { ScanImage } from './ScanImage'

const stats = [
  { label: 'Suppliers', value: '4' },
  { label: 'Build time', value: '2 wks' },
]

interface HeroPanelProps {
  shown: boolean
}

/**
 * The scene stops being a backdrop and starts being a room the content sits in:
 * a featured card and two readouts float over it on the right, where the branch
 * thins out. Hidden below `lg` — on a narrow screen it would fight the branch
 * for the same space, and the sections below say all of it anyway.
 */
export function HeroPanel({ shown }: HeroPanelProps) {
  return (
    <div
      className="pointer-events-none absolute right-6 top-1/2 z-10 hidden w-[19rem] -translate-y-1/2 lg:block xl:right-10"
      aria-hidden={!shown}
    >
      <div
        className="reveal pointer-events-auto border border-ink/10 bg-porcelain/90 p-3 shadow-[0_18px_50px_-30px_rgba(44,31,22,0.45)]"
        data-shown={shown}
        style={{ transitionDelay: '420ms' }}
      >
        <a href="#fitting" className="group block">
          <ScanImage
            src="/products/studio-1.jpg"
            alt="A cap being sewn to measurement in the studio"
            className="aspect-[4/3] w-full"
            delay={2600}
            duration={1300}
          />
          <div className="px-1 pb-1 pt-4">
            <p className="hud text-mocha">The install</p>
            <h2 className="display mt-2 text-2xl leading-tight">
              A unit is a measurement
              <span className="italic"> before it is a look.</span>
            </h2>
            <span className="hud mt-3 inline-block text-gold transition-colors duration-500 ease-atelier group-hover:text-ink">
              How it works →
            </span>
          </div>
        </a>
      </div>

      <dl
        className="reveal mt-4 grid grid-cols-2 gap-3"
        data-shown={shown}
        style={{ transitionDelay: '560ms' }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="border border-ink/10 bg-porcelain/90 px-4 py-3"
          >
            <dd className="display text-3xl text-gold">{stat.value}</dd>
            <dt className="hud mt-1 text-mocha">{stat.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  )
}
