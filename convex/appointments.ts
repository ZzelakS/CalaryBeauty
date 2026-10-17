import { appointmentPayload } from '../shared/appointmentRecord'
import { v } from 'convex/values'
import { paginationOptsValidator } from 'convex/server'
import { query, mutation } from './_generated/server'
import { requireAdmin } from './products'
import { productError } from '../shared/productErrors'
export const list=query({args:{paginationOpts:paginationOptsValidator},handler:async(ctx,args)=>{
 await requireAdmin(ctx)
 const page=await ctx.db.query('paymentRecords').withIndex('by_kind_status',q=>q.eq('kind','booking').eq('status','paid')).order('desc').paginate(args.paginationOpts)
 return {...page,page:page.page.map(record=>{
  const payload=appointmentPayload(record.payload)
  return {id:record._id,reference:record.requestId,transactionId:record.transactionId,...payload,date:record.appointmentDate ?? payload.booking.date,time:record.appointmentTime ?? payload.booking.time,status:record.appointmentStatus ?? 'confirmed',notes:record.studioNotes ?? '',deposit:record.amount}
 })}
}})
export const update=mutation({args:{id:v.id('paymentRecords'),date:v.string(),time:v.string(),status:v.union(v.literal('confirmed'),v.literal('completed'),v.literal('cancelled')),notes:v.string()},handler:async(ctx,args)=>{
 await requireAdmin(ctx);const record=await ctx.db.get(args.id)
 if(!record || record.kind!=='booking' || record.status!=='paid')productError('BOOKING_MISSING','This paid appointment could not be found. Reload the list.')
 if(!/^\d{4}-\d{2}-\d{2}$/.test(args.date) || new Date(`${args.date}T12:00:00Z`).toISOString().slice(0,10)!==args.date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(args.time))productError('BOOKING_TIME','Choose a valid appointment date and time.')
 if(args.notes.length>2000)productError('NOTES_TOO_LONG','Keep studio notes to 2,000 characters or fewer.')
 await ctx.db.patch(args.id,{appointmentDate:args.date,appointmentTime:args.time,appointmentStatus:args.status,studioNotes:args.notes})
 return null
}})
