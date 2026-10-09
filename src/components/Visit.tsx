import { useState } from 'react'
import { useReveal } from '@/hooks/useReveal'
import { ShaderButton } from './ShaderButton'

const INSTAGRAM = 'https://www.instagram.com/calarybeauty_/'
const BOOKING_EMAIL = 'mailto:hello@calarybeauty.com'

interface VisitProps {
  onNotice: (message: string) => void
}

export function Visit({ onNotice }: VisitProps) {
  const { ref, shown } = useReveal<HTMLDivElement>()
  const [email, setEmail] = useState('')

  const submit = () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      onNotice('That email address is not complete — check it and try again.')
      return
    }
    setEmail('')
    onNotice('You are on the list. We write once a month, at most.')
  }

  return (
    <section id="visit" className="border-t border-ink/10">
      <div className="mx-auto grid max-w-[1440px] gap-14 px-6 py-24 md:grid-cols-2 md:px-10 md:py-32">
        <div ref={ref} className="reveal" data-shown={shown}>
          <p className="hud text-mocha">Book</p>
          <h2 className="display mt-4 text-[clamp(2rem,5vw,3.5rem)]">
            Come in with your
            <br />
            hair as it is.
          </h2>
          <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-mocha">
            Appointments only, so the studio stays quiet. Send a message and we will come back with
            the next three openings.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ShaderButton onClick={() => window.open(INSTAGRAM, '_blank', 'noopener')}>
              Message on Instagram
            </ShaderButton>
            <ShaderButton
              tone="quiet"
              onClick={() => window.open(BOOKING_EMAIL, '_self')}
            >
              Email instead
            </ShaderButton>
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          {[
            {
              label: 'Studio',
              lines: ['By appointment', 'Baltimore, Maryland'],
            },
            {
              label: 'Hours',
              lines: ['Tue – Sat, 10am – 6pm', 'Sunday by request'],
            },
            {
              label: 'Shipping',
              lines: ['Free over $200, US', '2–4 business days'],
            },
            {
              label: 'Returns',
              lines: ['Unworn pieces, 7 days', 'Custom caps are final'],
            },
          ].map((block) => (
            <div key={block.label} className="border-t border-ink/10 pt-5">
              <p className="hud text-mocha/80">{block.label}</p>
              {block.lines.map((line) => (
                <p key={line} className="mt-2 text-sm text-ink/80">
                  {line}
                </p>
              ))}
            </div>
          ))}

          <div className="border-t border-ink/10 pt-5 sm:col-span-2">
            <p className="hud text-mocha/80">New pieces first</p>
            <div className="mt-4 flex items-center gap-3">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submit()
                }}
                placeholder="you@email.com"
                aria-label="Email address"
                className="w-full flex-1 border-b border-ink/20 bg-transparent pb-2 font-mono text-xs text-ink placeholder:text-mocha/50 focus:border-gold focus:outline-none"
              />
              <ShaderButton tone="quiet" className="px-5 py-2.5" onClick={submit}>
                Join
              </ShaderButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
