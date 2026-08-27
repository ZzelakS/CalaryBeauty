import { authTables } from '@convex-dev/auth/server'
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

/** Shared between the table definition and the write mutations. */
export const productFields = {
  /** URL-safe id used in links and cart lines. Stable once created. */
  slug: v.string(),
  name: v.string(),
  /** Small label beside the name — length, count, size. */
  tag: v.string(),
  subtitle: v.string(),
  /** Whole US dollars. */
  price: v.number(),
  /** Absolute ImageKit URL, or a path to a file in /public. */
  image: v.string(),
  /** ImageKit file id, kept so the file can be removed with the product. */
  imageFileId: v.optional(v.string()),
  category: v.union(v.literal('wigs'), v.literal('beauty')),
  origin: v.string(),
  detail: v.string(),
  specs: v.array(v.object({ label: v.string(), value: v.string() })),
  /** Wigs only — becomes the size picker in the quick view. */
  lengths: v.optional(v.array(v.string())),
  /** Drafts stay out of the storefront but stay in the dashboard. */
  active: v.boolean(),
  /** Low numbers sort first. */
  order: v.number(),
  updatedAt: v.number(),
}

export default defineSchema({
  // users, authSessions, authAccounts and friends, from @convex-dev/auth
  ...authTables,

  products: defineTable(productFields)
    .index('by_slug', ['slug'])
    .index('by_active', ['active']),
})
