import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useEffect, useState, useRef } from 'react'
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
  const cardRef=useRef<HTMLElement>(null)
  const reducedMotion=useReducedMotion()
  const photos = [product.image, ...(product.images ?? []).map((image) => image.url)].filter(Boolean)
  const photoKey = JSON.stringify(photos)
  const [activePhoto, setActivePhoto] = useState(0)
  useEffect(() => {
    setActivePhoto(0)
    if (photos.length < 2 || reducedMotion) return
    let visible=false,timer:number|undefined
    const update=()=>{if(timer)window.clearInterval(timer);timer=undefined;if(visible && !document.hidden)timer=window.setInterval(()=>setActivePhoto(current=>(current+1)%photos.length),3000)}
    const observer=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting ?? false;update()},{rootMargin:'100px'})
    if(cardRef.current)observer.observe(cardRef.current)
    document.addEventListener('visibilitychange',update)
    return()=>{observer.disconnect();document.removeEventListener('visibilitychange',update);if(timer)window.clearInterval(timer)}
  }, [photoKey,reducedMotion])
  const needsLength = Boolean(product.lengths?.length)

  return (
    <article ref={cardRef} className="group cursor-pointer rounded-lg transition-transform duration-300 motion-safe:hover:-translate-y-2 motion-safe:focus-within:-translate-y-2" onClick={() => onOpen(product)}>
      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); onOpen(product) }}
        className="relative block w-full text-left"
        aria-label={`View ${product.name}`}
      >
        <ScanImage
          src={imageUrl(photos[activePhoto] ?? product.image, 900, 1200)}
          alt={`${product.name} — ${product.subtitle}`}
          delay={index * 130}
          className="aspect-[3/4] w-full"
        />
        {product.inStock===false && <span className="stock-badge">Out of stock</span>}
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
          disabled={product.inStock===false}
          tone="quiet"
          className="w-full px-2 py-2.5 sm:w-auto sm:px-5"
          onClick={() => (needsLength ? onOpen(product) : onAdd(product))}
        >
          {product.inStock===false ? 'Out of stock':needsLength ? 'Choose length' : 'Add to bag'}
        </ShaderButton>
      </div>
    </article>
  )
}
