export interface Service {
  id: string
  name: string
  category: string
  rows: string
  image: string
  lengths: { name: string; price: number | null }[]
}

// Add a /public image path or ImageKit URL to each image field.
export const services: Service[] = [
  {
    id: 'small-knotless',
    name: 'Small knotless',
    category: 'Knotless',
    rows: '8 rows',
    image: '',
    lengths: [
      { name: 'Mid back', price: 350 },
      { name: 'Waist length', price: 400 },
      { name: 'Butt length', price: 450 },
    ],
  },
  {
    id: 's-medium-knotless',
    name: 'S-medium knotless',
    category: 'Knotless',
    rows: '6 rows',
    image: '',
    lengths: [
      { name: 'Mid back', price: 250 },
      { name: 'Waist length', price: 300 },
      { name: 'Butt length', price: 350 },
    ],
  },
  {
    id: 'medium-knotless',
    name: 'Medium knotless',
    category: 'Knotless',
    rows: '5 rows',
    image: '',
    lengths: [
      { name: 'Mid back', price: 200 },
      { name: 'Waist length', price: 250 },
      { name: 'Butt length', price: 280 },
    ],
  },
  {
    id: 'large-knotless',
    name: 'Large knotless',
    category: 'Knotless',
    rows: '4 rows / 4 counts',
    image: '',
    lengths: [
      { name: 'Mid back', price: 170 },
      { name: 'Waist length', price: 200 },
      { name: 'Butt length', price: 240 },
    ],
  },
  {
    id: 'jumbo-knotless',
    name: 'Jumbo knotless',
    category: 'Knotless',
    rows: '3 rows',
    image: '',
    lengths: [
      { name: 'Mid back', price: 120 },
      { name: 'Waist length', price: 150 },
      { name: 'Butt length', price: 170 },
    ],
  },
  {
    id: 'small-braids',
    name: 'Small braids',
    category: 'Regular braids',
    rows: '8 rows',
    image: '',
    lengths: [
      { name: 'Mid back', price: 200 },
      { name: 'Waist length', price: 220 },
      { name: 'Butt length', price: 250 },
      { name: 'Thigh length', price: 300 },
    ],
  },
  {
    id: 's-medium-braids',
    name: 'S-medium braids',
    category: 'Regular braids',
    rows: '6 rows',
    image: '',
    lengths: [
      { name: 'Mid back', price: 170 },
      { name: 'Waist length', price: 200 },
      { name: 'Butt length', price: 240 },
      { name: 'Thigh length', price: 280 },
    ],
  },
  {
    id: 'medium-braids',
    name: 'Medium braids',
    category: 'Regular braids',
    rows: '5 rows',
    image: '',
    lengths: [
      { name: 'Mid back', price: 150 },
      { name: 'Waist length', price: 180 },
      { name: 'Butt length', price: 220 },
      { name: 'Thigh length', price: 260 },
    ],
  },
  {
    id: 'large-braids',
    name: 'Large braids',
    category: 'Regular braids',
    rows: '4 rows / 4 counts',
    image: '',
    lengths: [
      { name: 'Mid back', price: 120 },
      { name: 'Waist length', price: 150 },
      { name: 'Butt length', price: 190 },
      { name: 'Thigh length', price: 230 },
    ],
  },
  {
    id: 'jumbo-braids',
    name: 'Jumbo braids',
    category: 'Regular braids',
    rows: '3 rows / 3 counts',
    image: '',
    lengths: [
      { name: 'Mid back', price: 100 },
      { name: 'Waist length', price: 120 },
      { name: 'Butt length', price: 160 },
      { name: 'Thigh length', price: 200 },
    ],
  },
  {
    id: 'kinky',
    name: 'Kinky braids',
    category: 'Other styles',
    rows: '',
    image: '',
    lengths: [
      { name: 'Shoulder length', price: 150 },
      { name: 'Mid back', price: 180 },
    ],
  },
  {
    id: 'closure-wig-install',
    name: 'Closure wig install',
    category: 'Wig installations',
    rows:
      '2 hours. Blow dry, cornrows and lace customization included. Lace must be untouched. HD or transparent lace recommended for a natural look.',
    image: '',
    lengths: [
      { name: 'Installation', price: 150 },
    ],
  },
  {
    id: 'frontal-wig-install',
    name: 'Frontal wig install',
    category: 'Wig installations',
    rows:
      '3 hours. Blow dry, cornrows and lace customization included. Lace must be untouched. HD or transparent lace recommended for a natural look.',
    image: '',
    lengths: [
      { name: 'Installation', price: 170 },
    ],
  },
]

export const extras = [
  { name: 'Bohemian curls', price: 50 },
  { name: 'Synthetic', price: 25 },
  { name: 'Beads', price: 20 },
  { name: 'Ombré', price: 20 },
  { name: 'Wash and blow dry', price: 30 },
  { name: 'Braids takeout', price: 50 },
]

export const DEPOSIT = 50