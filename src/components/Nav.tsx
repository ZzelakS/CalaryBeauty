import { useEffect, useState } from 'react'
import { AdminNavLink } from './AdminLink'

const links = [
  { id: 'collection', label: 'Shop' },
  { id: 'fitting', label: 'The install' },
  { id: 'atelier', label: 'Studio' },
  { id: 'visit', label: 'Book' },
]

interface NavProps {
  cartCount: number
  onOpenCart: () => void
}

export function Nav({ cartCount, onOpenCart }: NavProps) {
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const sections = links
      .map((link) => document.getElementById(link.id))
      .filter((node): node is HTMLElement => Boolean(node))

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.2, 0.6] },
    )
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    document.body.classList.toggle('is-locked', sheetOpen)
    return () => document.body.classList.remove('is-locked')
  }, [sheetOpen])

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-700 ease-atelier ${
          scrolled
            ? 'border-b border-ink/10 bg-porcelain/90 backdrop-blur-md'
            : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-5 md:px-10">
          <a href="#top" className="group flex items-center gap-3" aria-label="Calary Beauty home">
            <img
              src="/brand/calary-butterfly-ink.png"
              alt=""
              aria-hidden="true"
              className="h-7 w-auto"
            />
            <span className="display text-2xl leading-none tracking-[0.02em]">
              Calary <span className="text-gold">Beauty</span>
            </span>
          </a>

          <nav className="hidden items-center gap-9 md:flex" aria-label="Main">
            {links.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className="nav-link hud"
                data-active={active === link.id}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-5">
            <AdminNavLink className="hidden sm:inline-block" />
            <button
              type="button"
              onClick={onOpenCart}
              className="nav-link hud"
              aria-label={`Open bag, ${cartCount} item${cartCount === 1 ? '' : 's'}`}
            >
              Bag
              <span className="ml-2 text-gold">
                {cartCount.toString().padStart(2, '0')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="flex h-8 w-8 flex-col items-end justify-center gap-[5px] md:hidden"
              aria-label="Open menu"
            >
              <span className="block h-px w-6 bg-ink/60" />
              <span className="block h-px w-4 bg-ink/60" />
            </button>
          </div>
        </div>
      </header>

      {/* mobile sheet */}
      <div
        className={`fixed inset-0 z-50 bg-porcelain transition-opacity duration-500 ease-atelier md:hidden ${
          sheetOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        style={{
          visibility: sheetOpen ? 'visible' : 'hidden',
          transitionProperty: 'opacity, visibility',
          transitionDuration: '500ms, 0s',
          transitionDelay: sheetOpen ? '0ms, 0ms' : '0ms, 500ms',
        }}
        role="dialog"
        aria-modal="true"
        aria-hidden={!sheetOpen}
      >
        <div className="flex items-center justify-between px-6 py-5">
          <span className="display text-2xl">Calary <span className="text-gold">Beauty</span></span>
          <button
            type="button"
            onClick={() => setSheetOpen(false)}
            className="hud text-ink/60"
            aria-label="Close menu"
          >
            Close
          </button>
        </div>
        <div className="px-6">
          <AdminNavLink />
        </div>
        <nav className="mt-10 flex flex-col gap-2 px-6" aria-label="Mobile">
          {links.map((link, index) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={() => setSheetOpen(false)}
              className="flex items-baseline justify-between border-b border-ink/10 py-5"
            >
              <span className="display text-4xl">{link.label}</span>
              <span className="hud text-ink/35">{`0${index + 1}`}</span>
            </a>
          ))}
        </nav>
      </div>
    </>
  )
}
