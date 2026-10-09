import { useEffect, useState } from 'react'
import { formatPrice, type Product } from '@/data/products'
import { imageUrl } from '@/lib/imagekit'
import { ScanImage } from './ScanImage'
import { ShaderButton } from './ShaderButton'

interface ProductCardProps {
  product: Product
  index: number
  onOpen: (product: Product) => void
  onAdd: (product: Product) => void
}

export function ProductCard({ product, index, onOpen, onAdd }: ProductCardProps) {
  const photos = [product.image, ...(product.images ?? []).map((image) => image.url)].filter(Boolean)
  const photoKey = JSON.stringify(photos)
  const [activePhoto, setActivePhoto] = useState(0)
  useEffect(() => {
    setActivePhoto(0)
    if (photos.length < 2) return
    const timer = window.setInterval(() => setActivePhoto((current) => (current + 1) % photos.length), 3000)
    return () => window.clearInterval(timer)
  }, [photoKey])
  const needsLength = Boolean(product.lengths?.length)

  return (
    <article className="group cursor-pointer" onClick={() => onOpen(product)}>
      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); onOpen(product) }}
        className="block w-full text-left"
        aria-label={`View ${product.name}`}
      >
        <ScanImage
          src={imageUrl(photos[activePhoto] ?? product.image, 900, 1200)}
          alt={`${product.name} — ${product.subtitle}`}
          delay={index * 130}
          className="aspect-[3/4] w-full"
        />
      </button>

      <div className="mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <h3 className="display text-xl sm:text-2xl">
          {product.name}
          <span className="hud mt-1 block sm:ml-3 sm:mt-0 sm:inline sm:align-middle text-mocha">{product.tag}</span>
        </h3>
        <p className="font-mono text-xs text-gold">{formatPrice(product.price)}</p>
      </div>

      <p className="mt-2 text-sm text-mocha">{product.subtitle}</p>

      <div className="mt-4" onClick={(event) => event.stopPropagation()}>
        <ShaderButton
          tone="quiet"
          className="w-full px-2 py-2.5 sm:w-auto sm:px-5"
          onClick={() => (needsLength ? onOpen(product) : onAdd(product))}
        >
          {needsLength ? 'Choose length' : 'Add to bag'}
        </ShaderButton>
      </div>
    </article>
  )
}
