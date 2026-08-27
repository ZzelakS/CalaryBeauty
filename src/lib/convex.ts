import { ConvexReactClient } from 'convex/react'
import type { Product } from '@/data/products'

const url = import.meta.env.VITE_CONVEX_URL as string | undefined

/**
 * The storefront has to work before anyone has run `npx convex dev`, so nothing
 * connects until a deployment URL exists. Without it the site falls back to the
 * catalogue bundled in `src/data/products.ts`.
 */
export const isConvexConfigured = Boolean(url)

export const convex = isConvexConfigured
  ? new ConvexReactClient(url as string)
  : null

/**
 * HTTP actions are served from `.convex.site`, while queries and mutations use
 * `.convex.cloud`. Same deployment, different host.
 */
export function convexSiteUrl(): string {
  if (!url) return ''
  return url.replace(/\.convex\.cloud$/, '.convex.site')
}

/** Arguments for `products.save` — Convex uses `slug` where the UI uses `id`. */
export function toConvexProduct(product: Product) {
  return {
    slug: product.id,
    name: product.name,
    tag: product.tag,
    subtitle: product.subtitle,
    price: Number(product.price) || 0,
    image: product.image,
    imageFileId: product.imageFileId || undefined,
    category: product.category,
    origin: product.origin,
    detail: product.detail,
    specs: product.specs.filter((spec) => spec.label || spec.value),
    lengths: product.lengths?.length ? product.lengths : undefined,
    active: product.active,
    order: Number(product.order) || 0,
  }
}

/** URL-safe id derived from the product name. */
export function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || `product-${Math.random().toString(36).slice(2, 7)}`
}
