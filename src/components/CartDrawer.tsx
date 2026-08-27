import { useState } from 'react'
import { formatPrice } from '@/data/products'
import { imageUrl } from '@/lib/imagekit'
import { startCheckout } from '@/lib/checkout'
import { useCart } from '@/store/cart'
import { Drawer } from './Drawer'
import { ShaderButton } from './ShaderButton'

interface CartDrawerProps {
  open: boolean
  onClose: () => void
  onNotice: (message: string) => void
}

export function CartDrawer({ open, onClose, onNotice }: CartDrawerProps) {
  const { lines, subtotal, setQuantity, remove } = useCart()
  const [busy, setBusy] = useState(false)

  const checkout = async () => {
    setBusy(true)
    const result = await startCheckout(lines, subtotal)
    setBusy(false)
    onNotice(result.message)
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Your bag"
      footer={
        lines.length ? (
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="hud text-mocha">Subtotal</span>
              <span className="font-mono text-sm text-gold">{formatPrice(subtotal)}</span>
            </div>
            <p className="hud text-mocha/80">
              Free US shipping over $200. Everything else is quoted at checkout.
            </p>
            <ShaderButton full onClick={checkout} disabled={busy}>
              {busy ? 'Working…' : 'Go to checkout'}
            </ShaderButton>
          </div>
        ) : null
      }
    >
      {lines.length === 0 ? (
        <div className="px-6 py-16">
          <p className="display text-3xl text-ink/80">Nothing in here yet.</p>
          <p className="mt-3 text-sm text-mocha">
            Start with a length you already wear — we can always cut it shorter.
          </p>
          <div className="mt-7">
            <ShaderButton
              tone="quiet"
              onClick={() => {
                onClose()
                document.getElementById('collection')?.scrollIntoView()
              }}
            >
              Open the collection
            </ShaderButton>
          </div>
        </div>
      ) : (
        <ul>
          {lines.map((line) => (
            <li key={line.key} className="flex gap-4 border-b border-ink/10 px-6 py-5">
              <img
                src={imageUrl(line.product.image, 200, 240)}
                alt=""
                className="h-24 w-20 flex-none object-cover"
                loading="lazy"
              />
              <div className="flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="display text-xl">{line.product.name}</h3>
                  <span className="font-mono text-xs text-gold">
                    {formatPrice(line.lineTotal)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-mocha">
                  {line.product.subtitle}
                  {line.length ? ` · ${line.length}` : ''}
                </p>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center border border-ink/15">
                    <button
                      type="button"
                      onClick={() => setQuantity(line.key, line.quantity - 1)}
                      className="px-3 py-1.5 font-mono text-xs text-mocha hover:text-ink"
                      aria-label={`Remove one ${line.product.name}`}
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-mono text-xs">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(line.key, line.quantity + 1)}
                      className="px-3 py-1.5 font-mono text-xs text-mocha hover:text-ink"
                      aria-label={`Add one ${line.product.name}`}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(line.key)}
                    className="hud text-mocha transition-colors hover:text-gold"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  )
}
