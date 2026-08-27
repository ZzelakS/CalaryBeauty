import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import type { Product } from '@/data/products'
import { useCatalogue } from './catalogue'

export interface CartLine {
  productId: string
  length?: string
  quantity: number
}

export interface ResolvedLine extends CartLine {
  product: Product
  lineTotal: number
  key: string
}

type Action =
  | { type: 'add'; productId: string; length?: string }
  | { type: 'setQuantity'; key: string; quantity: number }
  | { type: 'remove'; key: string }
  | { type: 'clear' }
  | { type: 'hydrate'; lines: CartLine[] }

const STORAGE_KEY = 'calary.cart.v1'

function keyOf(line: CartLine): string {
  return `${line.productId}::${line.length ?? 'one'}`
}

function reducer(state: CartLine[], action: Action): CartLine[] {
  switch (action.type) {
    case 'hydrate':
      return action.lines
    case 'add': {
      const next = { productId: action.productId, length: action.length, quantity: 1 }
      const existing = state.find((line) => keyOf(line) === keyOf(next))
      if (existing) {
        return state.map((line) =>
          keyOf(line) === keyOf(next) ? { ...line, quantity: line.quantity + 1 } : line,
        )
      }
      return [...state, next]
    }
    case 'setQuantity':
      return state
        .map((line) =>
          keyOf(line) === action.key ? { ...line, quantity: Math.max(0, action.quantity) } : line,
        )
        .filter((line) => line.quantity > 0)
    case 'remove':
      return state.filter((line) => keyOf(line) !== action.key)
    case 'clear':
      return []
    default:
      return state
  }
}

interface CartValue {
  lines: ResolvedLine[]
  count: number
  subtotal: number
  add: (productId: string, length?: string) => void
  setQuantity: (key: string, quantity: number) => void
  remove: (key: string) => void
  clear: () => void
}

const CartContext = createContext<CartValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const { products: catalogue } = useCatalogue()
  const [raw, dispatch] = useReducer(reducer, [])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) dispatch({ type: 'hydrate', lines: JSON.parse(stored) as CartLine[] })
    } catch {
      // a corrupt or blocked store just means an empty bag
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(raw))
    } catch {
      // storage can be unavailable in private modes — the bag still works in memory
    }
  }, [raw])

  const value = useMemo<CartValue>(() => {
    const lines: ResolvedLine[] = raw.flatMap((line) => {
      const product = catalogue.find((item) => item.id === line.productId)
      if (!product) return []
      return [
        {
          ...line,
          product,
          key: keyOf(line),
          lineTotal: product.price * line.quantity,
        },
      ]
    })

    return {
      lines,
      count: lines.reduce((total, line) => total + line.quantity, 0),
      subtotal: lines.reduce((total, line) => total + line.lineTotal, 0),
      add: (productId, length) => dispatch({ type: 'add', productId, length }),
      setQuantity: (key, quantity) => dispatch({ type: 'setQuantity', key, quantity }),
      remove: (key) => dispatch({ type: 'remove', key }),
      clear: () => dispatch({ type: 'clear' }),
    }
  }, [raw, catalogue])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartValue {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used inside CartProvider')
  return context
}
