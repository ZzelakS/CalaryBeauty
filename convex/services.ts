import { v } from 'convex/values'
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { requireAdmin } from './products'
import { serviceFields } from './schema'
import { services as starterServices, extras as starterExtras, serviceDeposit, newNaturalServices } from '../shared/services'
import { productError } from '../shared/productErrors'
import { internal } from './_generated/api'
const key='catalog'
async function settings(ctx:QueryCtx|MutationCtx){return ctx.db.query('serviceSettings').withIndex('by_key',q=>q.eq('key',key)).unique()}
async function initialize(ctx:MutationCtx){
 if(await settings(ctx))return
 await ctx.db.insert('serviceSettings',{key,extras:starterExtras,updatedAt:Date.now()})
 for(const [order,service] of starterServices.entries())await ctx.db.insert('services',{slug:service.id,name:service.name,category:service.category,rows:service.rows,image:service.image,...(service.deposit ? {deposit:service.deposit as 20|50}:{}),lengths:service.lengths.map(l=>({name:l.name,price:l.price!})),active:true,order,updatedAt:Date.now()})
}
function publicService(s:{deposit?:number;slug:string;name:string;category:string;rows:string;image:string;lengths:{name:string;price:number}[]}){return {id:s.slug,name:s.name,category:s.category,rows:s.rows,image:s.image,deposit:serviceDeposit(s),lengths:s.lengths}}
export const listPublic=query({args:{},handler:async ctx=>{
 const config=await settings(ctx)
 if(!config)return {services:starterServices,extras:starterExtras}
 const rows=await ctx.db.query('services').withIndex('by_active',q=>q.eq('active',true)).collect()
 return {services:rows.sort((a,b)=>a.order-b.order).map(publicService),extras:config.extras}
}})
export const listAll=query({args:{},handler:async ctx=>{
 await requireAdmin(ctx);const config=await settings(ctx)
 const rows=config ? (await ctx.db.query('services').collect()).sort((a,b)=>a.order-b.order).map(s=>({...publicService(s),imageFileId:s.imageFileId,active:s.active,order:s.order})) : starterServices.map((s,order)=>({...s,imageFileId:undefined as string|undefined,active:true,order}))
 return {services:rows,extras:config?.extras ?? starterExtras}
}})
function validateService(s:{deposit?:number;name:string;category:string;lengths:{name:string;price:number}[];order:number}){
 if(!s.name.trim() || !s.category.trim())productError('SERVICE_REQUIRED','Enter a service name and category.')
 if(!Number.isFinite(s.order))productError('ORDER_INVALID','Enter a valid display order.')
 if(!s.lengths.length || s.lengths.some(l=>!l.name.trim() || !Number.isFinite(l.price) || l.price<serviceDeposit(s)))productError('LENGTH_INVALID',`Add at least one option priced at $${serviceDeposit(s)} or more to cover the deposit.`)
 if(new Set(s.lengths.map(l=>l.name.trim().toLowerCase())).size!==s.lengths.length)productError('DUPLICATE_LENGTH','Each length needs a different name.')
 if(/knotless|cornrow/i.test(`${s.name} ${s.category}`) && s.lengths.some(l=>/thigh/i.test(l.name)))productError('THIGH_REMOVED','Thigh length is not offered for knotless or cornrow services. Remove that option.')
}
export const save=mutation({args:{deposit:serviceFields.deposit,slug:v.string(),name:v.string(),category:v.string(),rows:v.string(),image:v.string(),imageFileId:v.optional(v.string()),lengths:serviceFields.lengths,active:v.boolean(),order:v.number(),creating:v.boolean()},handler:async(ctx,{creating,...s})=>{
 await requireAdmin(ctx)
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.slug))productError('LINK_INVALID','The service link must use lowercase letters, numbers and single hyphens.')
 await initialize(ctx)
 const existing=await ctx.db.query('services').withIndex('by_slug',q=>q.eq('slug',s.slug)).unique()
 if(creating && existing)productError('DUPLICATE_SERVICE','A service with this name already exists. Edit it or choose another name.')
 if(!creating && !existing)productError('SERVICE_MISSING','This service was removed. Reload the dashboard before editing.')
 const deposit=s.deposit ?? existing?.deposit ?? 50
 validateService({...s,deposit})
 const data={...s,deposit,name:s.name.trim(),category:s.category.trim(),lengths:s.lengths.map(l=>({...l,name:l.name.trim()})),updatedAt:Date.now()}
 if(existing){await ctx.db.patch(existing._id,data);if(existing.imageFileId && existing.imageFileId!==s.imageFileId)await ctx.scheduler.runAfter(0,internal.imagekit.deleteFile,{fileId:existing.imageFileId})}else await ctx.db.insert('services',data)
 return s.slug
}})
export const remove=mutation({args:{slug:v.string()},handler:async(ctx,{slug})=>{await requireAdmin(ctx);await initialize(ctx);const service=await ctx.db.query('services').withIndex('by_slug',q=>q.eq('slug',slug)).unique();if(service){await ctx.db.delete(service._id);if(service.imageFileId)await ctx.scheduler.runAfter(0,internal.imagekit.deleteFile,{fileId:service.imageFileId})}return null}})
export const saveExtras=mutation({args:{extras:v.array(v.object({name:v.string(),price:v.number()}))},handler:async(ctx,{extras})=>{
 await requireAdmin(ctx)
 if(extras.some(e=>!e.name.trim() || !Number.isFinite(e.price) || e.price<0))productError('EXTRA_INVALID','Every extra needs a name and a price of $0 or more.')
 if(new Set(extras.map(e=>e.name.trim().toLowerCase())).size!==extras.length)productError('EXTRA_DUPLICATE','Each extra needs a different name.')
 await initialize(ctx);const config=await settings(ctx);await ctx.db.patch(config!._id,{extras:extras.map(e=>({...e,name:e.name.trim()})),updatedAt:Date.now()});return null
}})

/** Run from the Convex CLI to add wig services without replacing existing edits. */
export const seedWigInstalls = internalMutation({
  args: {},
  returns: v.object({ added: v.number(), skipped: v.number() }),
  handler: async (ctx) => {
    const wigServices = starterServices.filter(
      (service) =>
        service.id === 'closure-wig-install' ||
        service.id === 'frontal-wig-install',
    )

    if (wigServices.length !== 2) {
      throw new Error(
        'Add Closure wig install and Frontal wig install to shared/services.ts first.',
      )
    }

    const prepared = wigServices.map((service) => {
      const lengths = service.lengths.map((length) => {
        if (length.price === null) {
          throw new Error(`Enter an installation price for ${service.name}.`)
        }
        return { name: length.name, price: length.price }
      })
      const order = service.id === 'closure-wig-install' ? 20 : 21
      validateService({ ...service, lengths, order })
      return {
        slug: service.id,
        name: service.name,
        category: service.category,
        rows: service.rows,
        image: service.image,
        lengths,
        active: true,
        order,
        updatedAt: Date.now(),
      }
    })

    await initialize(ctx)
    let added = 0
    let skipped = 0

    for (const service of prepared) {
      const existing = await ctx.db
        .query('services')
        .withIndex('by_slug', (q) => q.eq('slug', service.slug))
        .unique()

      if (existing) {
        skipped++
        continue
      }

      await ctx.db.insert('services', service)
      added++
    }

    return { added, skipped }
  },
})

// Authenticated, repeat-safe installation for already-initialized catalogues.
export const addNaturalStyles = mutation({args:{},returns:v.object({added:v.number(),skipped:v.number()}),handler:async ctx=>{
 await requireAdmin(ctx)
 await initialize(ctx)
 let added=0,skipped=0
 for(const [index,s] of newNaturalServices.entries()){
  const existing=await ctx.db.query('services').withIndex('by_slug',q=>q.eq('slug',s.id)).unique()
  if(existing){skipped++;continue}
  await ctx.db.insert('services',{slug:s.id,name:s.name,category:s.category,rows:s.rows,image:s.image,deposit:serviceDeposit(s) as 20|50,lengths:s.lengths.map(l=>({name:l.name,price:l.price!})),active:true,order:30+index,updatedAt:Date.now()});added++
 }
 return {added,skipped}
}})
