import { useEffect, useState } from 'react'
import { formatPrice, type Product } from '@/data/products'
import { imageUrl } from '@/lib/imagekit'
import { Drawer } from './Drawer'
import { ScanImage } from './ScanImage'
import { ShaderButton } from './ShaderButton'

interface QuickViewProps {
  product: Product | null
  open: boolean
  onClose: () => void
  onAdd: (product: Product, length?: string) => void
}

export function QuickView({ product, open, onClose, onAdd }: QuickViewProps) {
  const [length, setLength] = useState<string | undefined>(undefined)

  useEffect(() => {
    setLength(product?.lengths?.[1] ?? product?.lengths?.[0])
  }, [product])

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={product ? product.name : 'Piece'}
      footer={
        product ? (
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="hud text-mocha">Total</span>
              <span className="font-mono text-sm text-gold">{formatPrice(product.price)}</span>
            </div>
            <ShaderButton
              full
              onClick={() => {
                onAdd(product, length)
                onClose()
              }}
            >
              Add to bag
            </ShaderButton>
            <p className="hud text-center text-mocha/80">Install included in studio</p>
          </div>
        ) : null
      }
    >
      {product ? (
        <div className="pb-4">
          <ScanImage
            key={product.id}
            src={imageUrl(product.image, 960, 1200)}
            alt={`${product.name} — ${product.subtitle}`}
            className="h-[38vh] min-h-[240px] w-full"
            duration={950}
          />

          <div className="px-6 pt-7">
            <p className="hud text-mocha">{product.origin}</p>
            <h3 className="display mt-3 text-4xl">
              {product.name}
              <span className="hud ml-3 align-middle text-ink/35">{product.tag}</span>
            </h3>
            <p className="mt-2 text-sm text-mocha">{product.subtitle}</p>

            <p className="mt-6 text-[0.95rem] leading-relaxed text-ink/85">{product.detail}</p>

            {product.lengths ? (
              <div className="mt-8">
                <p className="hud text-mocha">Length</p>
                <div className="mt-3 flex gap-2">
                  {product.lengths.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setLength(option)}
                      aria-pressed={length === option}
                      className={`border px-4 py-2 font-mono text-xs transition-colors duration-500 ease-atelier ${
                        length === option
                          ? 'border-gold bg-gold/10 text-ink'
                          : 'border-ink/20 text-mocha hover:border-ink/45'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <dl className="mt-8 border-t border-ink/10">
              {product.specs.map((spec) => (
                <div
                  key={spec.label}
                  className="flex items-baseline justify-between border-b border-ink/10 py-3"
                >
                  <dt className="hud text-mocha">{spec.label}</dt>
                  <dd className="font-mono text-xs text-ink/85">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      ) : null}
    </Drawer>
  )
}
