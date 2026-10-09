import { useMemo, useState } from 'react'
import type { Category, Product } from '@/data/products'
import { useCatalogue } from '@/store/catalogue'
import { useReveal } from '@/hooks/useReveal'
import { ProductCard } from './ProductCard'

type Filter = 'all' | Category

const filters: { id: Filter; label: string }[] = [
  { id: 'wigs', label: 'Wigs' },
  { id: 'beauty', label: 'Beauty' },
  { id: 'all', label: 'Everything' },
]

interface CollectionProps {
  onOpen: (product: Product) => void
  onAdd: (product: Product) => void
}

export function Collection({ onOpen, onAdd }: CollectionProps) {
  const [filter, setFilter] = useState<Filter>('wigs')
  const { ref, shown } = useReveal<HTMLDivElement>()
  const { products, loading } = useCatalogue()

  const visible = useMemo(
    () => {
      if (filter !== 'all') {
        return products.filter((item) => item.category === filter)
      }
      return [
        ...products.filter((item) => item.category === 'wigs'),
        ...products.filter((item) => item.category !== 'wigs'),
      ]
    },
    [filter, products],
  )

  return (
    <section id="collection" className="mx-auto max-w-[1440px] px-6 py-24 md:px-10 md:py-32">
      <div ref={ref} className="reveal" data-shown={shown}>
        <div className="flex flex-wrap items-end justify-between gap-8 border-b border-ink/10 pb-8">
          <div>
            <p className="hud text-mocha">The collection</p>
            <h2 className="display mt-4 text-[clamp(2rem,5vw,3.5rem)]">
              Eight pieces. Every one
              <br />
              of them worn first.
            </h2>
          </div>
          <div className="flex items-center gap-6" role="tablist" aria-label="Filter collection">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                onClick={() => setFilter(item.id)}
                className="nav-link hud"
                data-active={filter === item.id}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!loading && !visible.length ? (
        <p className="mt-14 text-sm text-mocha">
          Nothing in this part of the shop yet — check back shortly.
        </p>
      ) : null}

      <div className="mt-14 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-8 sm:gap-y-16 lg:grid-cols-3">
        {visible.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            index={index}
            onOpen={onOpen}
            onAdd={onAdd}
          />
        ))}
      </div>
    </section>
  )
}
