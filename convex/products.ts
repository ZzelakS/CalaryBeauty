import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { internal } from './_generated/api'
import { productFields } from './schema'

/** The shape the client works with — `_id` and `_creationTime` stay in Convex. */
function toProduct(doc: Doc<'products'>) {
  return {
    id: doc.slug,
    name: doc.name,
    tag: doc.tag,
    subtitle: doc.subtitle,
    price: doc.price,
    image: doc.image,
    imageFileId: doc.imageFileId,
    category: doc.category,
    origin: doc.origin,
    detail: doc.detail,
    specs: doc.specs,
    lengths: doc.lengths,
    active: doc.active,
    order: doc.order,
    updatedAt: doc.updatedAt,
  }
}

function byOrder(a: { order: number; name: string }, b: { order: number; name: string }) {
  return a.order - b.order || a.name.localeCompare(b.name)
}

/**
 * Who is allowed to write.
 *
 * The allowlist lives in a Convex environment variable rather than the client
 * bundle, so it cannot be edited from a browser:
 *
 *   npx convex env set ADMIN_EMAILS "you@calarybeauty.com,studio@calarybeauty.com"
 */
async function requireAdmin(ctx: MutationCtx): Promise<Doc<'users'>> {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new Error('Sign in first.')

  const user = await ctx.db.get(userId)
  if (!user) throw new Error('That account no longer exists.')

  const allowlist = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

  if (!allowlist.length) {
    throw new Error(
      'No admins configured. Run: npx convex env set ADMIN_EMAILS "you@example.com"',
    )
  }
  if (!user.email || !allowlist.includes(user.email.toLowerCase())) {
    throw new Error('This account is not on the studio admin list.')
  }
  return user
}

/** Storefront: live products only. Public on purpose. */
export const listPublic = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const docs = await ctx.db
      .query('products')
      .withIndex('by_active', (q) => q.eq('active', true))
      .collect()
    return docs.map(toProduct).sort(byOrder)
  },
})

/** Dashboard: everything, drafts included. */
export const listAll = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []
    const docs = await ctx.db.query('products').collect()
    return docs.map(toProduct).sort(byOrder)
  },
})

/** Whether the signed-in account may write. Drives the dashboard UI. */
export const viewer = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const user = await ctx.db.get(userId)
    const allowlist = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)

    return {
      email: user?.email ?? null,
      isAdmin: Boolean(
        allowlist.length && user?.email && allowlist.includes(user.email.toLowerCase()),
      ),
      allowlistConfigured: allowlist.length > 0,
    }
  },
})

const writeArgs = {
  slug: productFields.slug,
  name: productFields.name,
  tag: productFields.tag,
  subtitle: productFields.subtitle,
  price: productFields.price,
  image: productFields.image,
  imageFileId: productFields.imageFileId,
  category: productFields.category,
  origin: productFields.origin,
  detail: productFields.detail,
  specs: productFields.specs,
  lengths: productFields.lengths,
  active: productFields.active,
  order: productFields.order,
}

/** Create or update, keyed on slug. */
export const save = mutation({
  args: writeArgs,
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const existing = await ctx.db
      .query('products')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    const document = { ...args, updatedAt: Date.now() }

    if (existing) {
      // a replaced image leaves an orphan in ImageKit — clean it up
      if (existing.imageFileId && existing.imageFileId !== args.imageFileId) {
        await ctx.scheduler.runAfter(0, internal.imagekit.deleteFile, {
          fileId: existing.imageFileId,
        })
      }
      await ctx.db.patch(existing._id, document)
      return existing.slug
    }

    await ctx.db.insert('products', document)
    return args.slug
  },
})

export const remove = mutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    await requireAdmin(ctx)

    const existing = await ctx.db
      .query('products')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique()
    if (!existing) return false

    await ctx.db.delete(existing._id)
    if (existing.imageFileId) {
      await ctx.scheduler.runAfter(0, internal.imagekit.deleteFile, {
        fileId: existing.imageFileId,
      })
    }
    return true
  },
})

/** Writes the catalogue bundled with the build. Skips slugs that already exist. */
export const seedMany = mutation({
  args: { products: v.array(v.object(writeArgs)) },
  handler: async (ctx, { products }) => {
    await requireAdmin(ctx)

    let written = 0
    for (const product of products) {
      const existing = await ctx.db
        .query('products')
        .withIndex('by_slug', (q) => q.eq('slug', product.slug))
        .unique()
      if (existing) continue
      await ctx.db.insert('products', { ...product, updatedAt: Date.now() })
      written += 1
    }
    return written
  },
})
