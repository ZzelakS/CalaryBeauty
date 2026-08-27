import { useEffect, useState } from 'react'
import { categories, type Category, type Product, type ProductSpec } from '@/data/products'
import { slugify } from '@/lib/convex'
import { ImageField } from './ImageField'

interface ProductFormProps {
  product: Product | null
  existingIds: string[]
  onCancel: () => void
  onSave: (product: Product) => Promise<void>
}

function blank(order: number): Product {
  return {
    id: '',
    name: '',
    tag: '',
    subtitle: '',
    price: 0,
    image: '',
    category: 'wigs',
    origin: '',
    detail: '',
    specs: [{ label: '', value: '' }],
    lengths: [],
    active: true,
    order,
  }
}

const fieldClass =
  'mt-2 w-full border border-ink/20 bg-porcelain px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none'
const labelClass = 'hud text-mocha'

export function ProductForm({ product, existingIds, onCancel, onSave }: ProductFormProps) {
  const [draft, setDraft] = useState<Product>(product ?? blank((existingIds.length + 1) * 10))
  const [lengthsText, setLengthsText] = useState((product?.lengths ?? []).join(', '))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDraft(product ?? blank((existingIds.length + 1) * 10))
    setLengthsText((product?.lengths ?? []).join(', '))
    setError(null)
  }, [product, existingIds.length])

  const isNew = !product
  const set = <K extends keyof Product>(key: K, value: Product[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const setSpec = (index: number, patch: Partial<ProductSpec>) =>
    setDraft((current) => ({
      ...current,
      specs: current.specs.map((spec, i) => (i === index ? { ...spec, ...patch } : spec)),
    }))

  const submit = async () => {
    setError(null)

    const id = draft.id || slugify(draft.name)
    if (!draft.name.trim()) return setError('The product needs a name.')
    if (!draft.subtitle.trim()) return setError('Add a short subtitle — it shows under the name.')
    if (!Number.isFinite(draft.price) || draft.price <= 0) return setError('Set a price above zero.')
    if (!draft.image.trim()) return setError('Add an image before saving.')
    if (isNew && existingIds.includes(id)) {
      return setError(`There is already a product with the id "${id}". Change the name slightly.`)
    }

    const lengths = lengthsText
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)

    setSaving(true)
    try {
      await onSave({
        ...draft,
        id,
        name: draft.name.trim(),
        specs: draft.specs.filter((spec) => spec.label.trim() || spec.value.trim()),
        lengths: draft.category === 'wigs' ? lengths : [],
      })
    } catch (failure) {
      setError((failure as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-ink/15 bg-linen/60 p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="display text-3xl">{isNew ? 'New product' : `Editing ${product?.name}`}</h2>
        <button type="button" onClick={onCancel} className="hud text-mocha hover:text-ink">
          Close
        </button>
      </div>

      <div className="mt-7 grid gap-6 md:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="name">
            Name
          </label>
          <input
            id="name"
            value={draft.name}
            onChange={(event) => set('name', event.target.value)}
            className={fieldClass}
            placeholder="Monarch"
          />
          <p className="hud mt-2 text-mocha/70">
            id · {draft.id || slugify(draft.name) || '—'}
            {isNew ? '' : ' (fixed)'}
          </p>
        </div>

        <div>
          <label className={labelClass} htmlFor="type">
            Product type
          </label>
          <select
            id="type"
            value={draft.category}
            onChange={(event) => set('category', event.target.value as Category)}
            className={fieldClass}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="tag">
            Tag
          </label>
          <input
            id="tag"
            value={draft.tag}
            onChange={(event) => set('tag', event.target.value)}
            className={fieldClass}
            placeholder="22 inch · 5 pairs · 60ml"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="price">
            Price (USD)
          </label>
          <input
            id="price"
            type="number"
            min={0}
            step={1}
            value={draft.price || ''}
            onChange={(event) => set('price', Number(event.target.value))}
            className={fieldClass}
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="subtitle">
            Subtitle
          </label>
          <input
            id="subtitle"
            value={draft.subtitle}
            onChange={(event) => set('subtitle', event.target.value)}
            className={fieldClass}
            placeholder="Body wave, glueless"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="origin">
            Origin
          </label>
          <input
            id="origin"
            value={draft.origin}
            onChange={(event) => set('origin', event.target.value)}
            className={fieldClass}
            placeholder="Single donor, Vietnam"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="order">
            Sort order
          </label>
          <input
            id="order"
            type="number"
            value={draft.order}
            onChange={(event) => set('order', Number(event.target.value))}
            className={fieldClass}
          />
          <p className="hud mt-2 text-mocha/70">Low numbers show first</p>
        </div>

        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="detail">
            Description
          </label>
          <textarea
            id="detail"
            rows={4}
            value={draft.detail}
            onChange={(event) => set('detail', event.target.value)}
            className={fieldClass}
            placeholder="What it is, how it wears, who it suits."
          />
        </div>

        {draft.category === 'wigs' ? (
          <div className="md:col-span-2">
            <label className={labelClass} htmlFor="lengths">
              Lengths
            </label>
            <input
              id="lengths"
              value={lengthsText}
              onChange={(event) => setLengthsText(event.target.value)}
              className={fieldClass}
              placeholder={'18", 22", 26"'}
            />
            <p className="hud mt-2 text-mocha/70">
              Comma separated. Shoppers pick one before adding to the bag.
            </p>
          </div>
        ) : null}

        <div className="md:col-span-2">
          <p className={labelClass}>Specifications</p>
          <div className="mt-3 space-y-2">
            {draft.specs.map((spec, index) => (
              <div key={index} className="flex gap-2">
                <input
                  value={spec.label}
                  onChange={(event) => setSpec(index, { label: event.target.value })}
                  placeholder="Density"
                  className="w-1/3 border border-ink/20 bg-porcelain px-3 py-2 text-sm focus:border-gold focus:outline-none"
                />
                <input
                  value={spec.value}
                  onChange={(event) => setSpec(index, { value: event.target.value })}
                  placeholder="180%"
                  className="flex-1 border border-ink/20 bg-porcelain px-3 py-2 text-sm focus:border-gold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      specs: current.specs.filter((_, i) => i !== index),
                    }))
                  }
                  className="hud px-3 text-mocha hover:text-ink"
                  aria-label={`Remove specification ${index + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                specs: [...current.specs, { label: '', value: '' }],
              }))
            }
            className="hud mt-3 border border-ink/25 px-4 py-2 transition-colors hover:border-gold"
          >
            Add a row
          </button>
        </div>

        <div className="md:col-span-2">
          <ImageField
            value={draft.image}
            fileId={draft.imageFileId}
            onChange={(url, fileId) =>
              setDraft((current) => ({ ...current, image: url, imageFileId: fileId }))
            }
          />
        </div>

        <div className="md:col-span-2">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(event) => set('active', event.target.checked)}
              className="h-4 w-4 accent-[#C08A34]"
            />
            <span className="text-sm text-ink">
              Visible in the shop
              <span className="text-mocha"> — uncheck to keep it as a draft</span>
            </span>
          </label>
        </div>
      </div>

      {error ? <p className="mt-6 text-sm text-red-700">{error}</p> : null}

      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="hud border border-gold bg-gold/10 px-6 py-3 transition-colors hover:bg-gold/20 disabled:opacity-50"
        >
          {saving ? 'Saving…' : isNew ? 'Create product' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="hud border border-ink/20 px-6 py-3 transition-colors hover:border-ink/50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
