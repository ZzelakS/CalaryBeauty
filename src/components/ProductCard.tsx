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
  const needsLength = Boolean(product.lengths?.length)

  return (
    <article className="group">
      <button
        type="button"
        onClick={() => onOpen(product)}
        className="block w-full text-left"
        aria-label={`View ${product.name}`}
      >
        <ScanImage
          src={imageUrl(product.image, 900, 1200)}
          alt={`${product.name} — ${product.subtitle}`}
          delay={index * 130}
          className="aspect-[3/4] w-full"
        />
      </button>

      <div className="mt-5 flex items-baseline justify-between gap-4">
        <h3 className="display text-2xl">
          {product.name}
          <span className="hud ml-3 align-middle text-mocha">{product.tag}</span>
        </h3>
        <p className="font-mono text-xs text-gold">{formatPrice(product.price)}</p>
      </div>

      <p className="mt-2 text-sm text-mocha">{product.subtitle}</p>

      <div className="mt-4">
        <ShaderButton
          tone="quiet"
          className="px-5 py-2.5"
          onClick={() => (needsLength ? onOpen(product) : onAdd(product))}
        >
          {needsLength ? 'Choose length' : 'Add to bag'}
        </ShaderButton>
      </div>
    </article>
  )
}
