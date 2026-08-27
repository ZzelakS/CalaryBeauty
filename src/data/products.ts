export type Category = 'wigs' | 'beauty'

export const categories: { id: Category; label: string }[] = [
  { id: 'wigs', label: 'Wigs' },
  { id: 'beauty', label: 'Beauty' },
]

export interface ProductSpec {
  label: string
  value: string
}

export interface Product {
  id: string
  name: string
  /** Short label shown beside the name — length, count, size. */
  tag: string
  subtitle: string
  price: number
  /** Absolute image URL. ImageKit when uploaded from the dashboard. */
  image: string
  /** ImageKit file id, kept so the file can be removed with the product. */
  imageFileId?: string
  category: Category
  origin: string
  detail: string
  specs: ProductSpec[]
  lengths?: string[]
  /** Draft products stay out of the storefront but remain in the dashboard. */
  active: boolean
  /** Low numbers sort first in the grid. */
  order: number
  updatedAt?: number
}

export function formatPrice(value: number): string {
  return `$${value.toLocaleString('en-US')}`
}

/** Shipped with the build, and what the dashboard writes when you seed. */
export const seedProducts: Product[] = [
  {
    id: 'monarch',
    active: true,
    order: 10,
    name: 'Monarch',
    tag: '22 inch',
    subtitle: 'Body wave, glueless',
    price: 385,
    image: '/products/monarch.jpg',
    category: 'wigs',
    origin: 'Single donor, Vietnam',
    detail:
      'A loose body wave that keeps its bend after washing. Built on a 13×4 HD lace frontal with the knots bleached to your scalp tone, so the parting reads as skin in daylight.',
    specs: [
      { label: 'Density', value: '180%' },
      { label: 'Lace', value: '13×4 HD frontal' },
      { label: 'Cap', value: 'Glueless, adjustable band' },
      { label: 'Wear', value: '2–3 years with care' },
    ],
    lengths: ['18"', '22"', '26"'],
  },
  {
    id: 'wing',
    active: true,
    order: 20,
    name: 'Wing',
    tag: '12 inch',
    subtitle: 'Blunt bob, glueless',
    price: 220,
    image: '/products/wing.jpg',
    category: 'wigs',
    origin: 'Single donor, Cambodia',
    detail:
      'Cut to the jaw with a hard blunt line. Silicone grips and four combs mean it goes on in under a minute and comes off at the door — the easiest piece here to live in.',
    specs: [
      { label: 'Density', value: '150%' },
      { label: 'Lace', value: '5×5 closure' },
      { label: 'Cap', value: 'Glueless, four combs' },
      { label: 'Wear', value: '18 months with care' },
    ],
    lengths: ['10"', '12"', '14"'],
  },
  {
    id: 'silk',
    active: true,
    order: 30,
    name: 'Silk',
    tag: '26 inch',
    subtitle: 'Straight, full lace',
    price: 520,
    image: '/products/silk.jpg',
    category: 'wigs',
    origin: 'Single donor, Vietnam',
    detail:
      'The longest unit in the studio and the one that takes the most hours. Full lace, so it parts anywhere and can be worn up without a track showing.',
    specs: [
      { label: 'Density', value: '200%' },
      { label: 'Lace', value: 'Full lace, Swiss' },
      { label: 'Cap', value: 'Sewn to measurement' },
      { label: 'Wear', value: '3 years with care' },
    ],
    lengths: ['24"', '26"', '30"'],
  },
  {
    id: 'bloom',
    active: true,
    order: 40,
    name: 'Bloom',
    tag: '18 inch',
    subtitle: 'Kinky curly, 4A pattern',
    price: 340,
    image: '/products/bloom.jpg',
    category: 'wigs',
    origin: 'Single donor, Nigeria',
    detail:
      'A 4A pattern that blends with your own texture instead of asking you to hide it. Ships stretched — wet it once and the coil comes right back.',
    specs: [
      { label: 'Density', value: '180%' },
      { label: 'Lace', value: '13×4 HD frontal' },
      { label: 'Cap', value: 'Glueless, adjustable band' },
      { label: 'Wear', value: '2 years with care' },
    ],
    lengths: ['16"', '18"', '20"'],
  },
  {
    id: 'ripple',
    active: true,
    order: 50,
    name: 'Ripple',
    tag: '24 inch',
    subtitle: 'Deep wave, layered',
    price: 445,
    image: '/products/ripple.jpg',
    category: 'wigs',
    origin: 'Single donor, Cambodia',
    detail:
      'Layered through the crown so the wave stacks instead of hanging flat. Best on a longer face — we will tell you at the consult if it is wrong for yours.',
    specs: [
      { label: 'Density', value: '200%' },
      { label: 'Lace', value: '13×6 HD frontal' },
      { label: 'Cap', value: 'Glueless, adjustable band' },
      { label: 'Wear', value: '2–3 years with care' },
    ],
    lengths: ['20"', '24"', '28"'],
  },
  {
    id: 'flutter',
    active: true,
    order: 60,
    name: 'Flutter',
    tag: '5 pairs',
    subtitle: 'Mink lash set',
    price: 28,
    image: '/products/flutter.jpg',
    category: 'beauty',
    origin: 'Made for Calary',
    detail:
      'Five pairs on a soft cotton band, graduated from an everyday length to a full evening flare. Reusable up to twenty wears if you clean them.',
    specs: [
      { label: 'Set', value: '5 pairs, graduated' },
      { label: 'Band', value: 'Cotton, cuttable' },
      { label: 'Reuse', value: 'Up to 20 wears' },
    ],
  },
  {
    id: 'nectar',
    active: true,
    order: 70,
    name: 'Nectar',
    tag: '6 shades',
    subtitle: 'High-shine lip gloss',
    price: 18,
    image: '/products/nectar.jpg',
    category: 'beauty',
    origin: 'Made for Calary',
    detail:
      'Non-sticky, buildable, and clear enough to sit over any liner. Six shades from a bare honey to a deep bronze — all of them tested on deeper skin first.',
    specs: [
      { label: 'Size', value: '5ml' },
      { label: 'Finish', value: 'High shine, non-sticky' },
      { label: 'Shades', value: '6' },
    ],
  },
  {
    id: 'root',
    active: true,
    order: 80,
    name: 'Root',
    tag: '60ml',
    subtitle: 'Scalp and edge oil',
    price: 24,
    image: '/products/root.jpg',
    category: 'beauty',
    origin: 'Blended in Baltimore',
    detail:
      'For the hair under the unit. Part, apply along the scalp, leave it overnight. Thin enough that it does not sit on braids or weigh the edges down.',
    specs: [
      { label: 'Size', value: '60ml, glass' },
      { label: 'Use', value: 'Twice weekly' },
      { label: 'Scent', value: 'Rosemary, faint' },
    ],
  },
]
