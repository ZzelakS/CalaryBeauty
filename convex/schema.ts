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
  images: v.optional(v.array(v.object({ url: v.string(), fileId: v.optional(v.string()) }))),
  category: v.union(v.literal('wigs'), v.literal('beauty')),
  origin: v.string(),
  detail: v.string(),
  specs: v.array(v.object({ label: v.string(), value: v.string() })),
  /** Wigs only — becomes the size picker in the quick view. */
  lengths: v.optional(v.array(v.string())),
  /** Drafts stay out of the storefront but stay in the dashboard. */
  active: v.boolean(),
  inStock: v.optional(v.boolean()),
  /** Low numbers sort first. */
  order: v.number(),
  updatedAt: v.number(),
}

export const serviceFields={
 deposit:v.optional(v.union(v.literal(20),v.literal(50))),
 slug:v.string(),name:v.string(),category:v.string(),rows:v.string(),image:v.string(),imageFileId:v.optional(v.string()),
 lengths:v.array(v.object({name:v.string(),price:v.number()})),active:v.boolean(),order:v.number(),updatedAt:v.number(),
}
export default defineSchema({
 newsletterSubscribers:defineTable({email:v.string(),status:v.union(v.literal('pending'),v.literal('confirmed')),token:v.string(),expiresAt:v.number(),version:v.number(),createdAt:v.number(),lastRequestedAt:v.number(),confirmedAt:v.optional(v.number()),consentText:v.string(),mailStatus:v.union(v.literal('queued'),v.literal('accepted'),v.literal('failed')),mailError:v.optional(v.string()),syncStatus:v.union(v.literal('disabled'),v.literal('pending'),v.literal('synced'),v.literal('failed')),syncError:v.optional(v.string())}).index('by_email',['email']).index('by_token',['token']),
 newsletterLimits:defineTable({bucket:v.string(),count:v.number()}).index('by_bucket',['bucket']),
 services:defineTable(serviceFields).index('by_slug',['slug']).index('by_active',['active']),
 serviceSettings:defineTable({key:v.string(),extras:v.array(v.object({name:v.string(),price:v.number()})),updatedAt:v.number()}).index('by_key',['key']),
  // users, authSessions, authAccounts and friends, from @convex-dev/auth
  ...authTables,

  paymentRecords: defineTable({
    requestId: v.string(), payload: v.string(), kind: v.union(v.literal('order'), v.literal('booking')),
    amount: v.number(), status: v.union(v.literal('processing'), v.literal('paid'), v.literal('declined'), v.literal('unknown')),
    appointmentStatus:v.optional(v.union(v.literal('confirmed'),v.literal('completed'),v.literal('cancelled'))),appointmentDate:v.optional(v.string()),appointmentTime:v.optional(v.string()),studioNotes:v.optional(v.string()),
    transactionId: v.optional(v.string()), walletState: v.optional(v.string()), paypalReference: v.optional(v.string()), walletClaimed: v.optional(v.boolean()), updatedAt: v.number(),
  }).index('by_requestId', ['requestId']).index('by_kind_status',['kind','status']),

  products: defineTable(productFields)
    .index('by_slug', ['slug'])
    .index('by_active', ['active']),
})
