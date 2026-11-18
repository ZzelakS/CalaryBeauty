import { studio } from '@/data/contact'
import { Policies } from './Policies'
import { StudioFooterLink } from './AdminLink'

const columns = [
  {
    label: 'Shop',
    items: [
      { label: 'Wigs', href: '/#collection' },
      { label: 'Beauty', href: '/#collection' },
      { label: 'The install', href: '/#fitting' },
    ],
  },
  {
    label: 'Studio',
    items: [
      { label: 'Contact & visit', href: '/contact' },
      { label: 'Book', href: '/#visit' },
      { label: 'Instagram', href: 'https://www.instagram.com/calarybeauty_/' },
    ],
  },
  {
    label: 'Help',
    items: [
      { label: 'Wash guide', href: '/#fitting' },
      { label: 'Shipping & help', href: '/contact' },
      { label: 'Contact us', href: '/contact' },
    ],
  },
]

/**
 * The one dark band on the page — the logo was drawn for black, so it gets to
 * sit on it once, at the end.
 */
export function Footer() {
  return (
    <footer className="bg-noir text-porcelain">
      <div className="mx-auto max-w-[1440px] px-6 py-16 md:px-10">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,0.6fr)]">
          <div>
            <img
              src="/brand/calary-logo-gold.png"
              alt="Calary Beauty — beauty crafted for every woman"
              className="h-32 w-auto"
              loading="lazy"
            />
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-porcelain/55">
              Custom units, installs and the products that keep them. Baltimore, Maryland.
            </p>
            <address className="mt-4 text-sm not-italic leading-7 text-porcelain/65">{studio.street}<br/>{studio.locality}</address>
            <a href="/contact" className="mt-3 inline-block text-xs text-honey underline underline-offset-4">Plan your visit</a>
          </div>

          {columns.map((column) => (
            <nav key={column.label} aria-label={column.label}>
              <p className="hud text-honey/70">{column.label}</p>
              <ul className="mt-4 space-y-3">
                {column.items.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="text-sm text-porcelain/60 transition-colors duration-500 ease-atelier hover:text-honey"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-porcelain/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="hud text-porcelain/35">
            © {new Date().getFullYear()} Calary Beauty
          </p>
          <div className="flex items-center gap-6">
            <Policies />
            <StudioFooterLink />
            <p className="hud text-porcelain/35">
              {' '}
              <a
                href={`https://wa.me/2349062288078?text=${encodeURIComponent(
                  "Hi Lamar, I’m interested in your services. Could we discuss my project and your pricing?"
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-porcelain/60 transition-colors hover:text-honey"
              >
                Lamar
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
