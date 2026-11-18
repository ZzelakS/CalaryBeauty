import { v } from 'convex/values'
import { internalMutation, query, mutation, type MutationCtx } from './_generated/server'
import { requireAdmin } from './products'
import { productError } from '../shared/productErrors'
import { bookingHours } from '../shared/bookingHours'

const minute = (time:string) => Number(time.slice(0,2))*60+Number(time.slice(3,5))
const dateOk = (date:string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && new Date(`${date}T12:00:00Z`).toISOString().slice(0,10)===date
const overlap=(aStart:number,aEnd:number,bStart:number,bEnd:number)=>aStart<bEnd && bStart<aEnd
async function blocks(ctx:MutationCtx,date:string,exceptRequestId?:string){
 const now=Date.now()
 return (await ctx.db.query('scheduleBlocks').withIndex('by_date',q=>q.eq('date',date)).collect())
  .filter(block=>block.kind!=='hold' || (block.expiresAt ?? 0)>now)
  .filter(block=>block.requestId!==exceptRequestId)
}
function validateWindow(date:string,start:number,end:number){
 const hours=bookingHours(date)
 if(!dateOk(date) || !hours || start<minute(hours.min) || end>minute(hours.max))throw new Error('That service and buffer must fit within the studio’s open hours.')
}
export const availability=query({args:{date:v.string(),durationMinutes:v.number(),bufferMinutes:v.number()},handler:async(ctx,args)=>{
 if(!dateOk(args.date) || !Number.isInteger(args.durationMinutes) || !Number.isInteger(args.bufferMinutes))return {open:false,slots:[] as string[]}
 const hours=bookingHours(args.date);if(!hours)return {open:false,slots:[] as string[]}
 const busy=(await ctx.db.query('scheduleBlocks').withIndex('by_date',q=>q.eq('date',args.date)).collect()).filter(block=>block.kind!=='hold' || (block.expiresAt ?? 0)>Date.now())
 const start=minute(hours.min),close=minute(hours.max),needed=args.durationMinutes+args.bufferMinutes,slots:string[]=[]
 for(let value=start;value+needed<=close;value+=30){if(!busy.some(block=>overlap(value,value+needed,block.startMinute,block.endMinute)))slots.push(`${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`)}
 return {open:true,slots}
}})
export const reserveHold=internalMutation({args:{requestId:v.string(),date:v.string(),time:v.string(),durationMinutes:v.number(),bufferMinutes:v.number(),expiresAt:v.number(),title:v.string()},handler:async(ctx,args)=>{
 const start=minute(args.time),end=start+args.durationMinutes+args.bufferMinutes
 validateWindow(args.date,start,end)
 const own=await ctx.db.query('scheduleBlocks').withIndex('by_requestId',q=>q.eq('requestId',args.requestId)).unique()
 if(own)return null
 if((await blocks(ctx,args.date,args.requestId)).some(block=>overlap(start,end,block.startMinute,block.endMinute)))throw new Error('That time was just booked. Please choose another available appointment time.')
 await ctx.db.insert('scheduleBlocks',{date:args.date,startMinute:start,endMinute:end,kind:'hold',requestId:args.requestId,title:args.title.slice(0,180),expiresAt:args.expiresAt*1000,createdAt:Date.now(),updatedAt:Date.now()});return null
}})
export const releaseHold=internalMutation({args:{requestId:v.string()},handler:async(ctx,{requestId})=>{
 const block=await ctx.db.query('scheduleBlocks').withIndex('by_requestId',q=>q.eq('requestId',requestId)).unique();if(block?.kind==='hold')await ctx.db.delete(block._id);return null
}})
export const confirmBooking=internalMutation({args:{requestId:v.string()},handler:async(ctx,{requestId})=>{
 const block=await ctx.db.query('scheduleBlocks').withIndex('by_requestId',q=>q.eq('requestId',requestId)).unique()
 if(block?.kind==='hold')await ctx.db.patch(block._id,{kind:'booking',expiresAt:undefined,updatedAt:Date.now()})
 return null
}})
export const moveBooking=internalMutation({args:{requestId:v.string(),date:v.string(),time:v.string(),durationMinutes:v.number(),bufferMinutes:v.number()},handler:async(ctx,args)=>{
 const block=await ctx.db.query('scheduleBlocks').withIndex('by_requestId',q=>q.eq('requestId',args.requestId)).unique();if(!block)return null
 const start=minute(args.time),end=start+args.durationMinutes+args.bufferMinutes;validateWindow(args.date,start,end)
 if((await blocks(ctx,args.date,args.requestId)).some(other=>overlap(start,end,other.startMinute,other.endMinute)))throw new Error('This time conflicts with another appointment or unavailable time.')
 await ctx.db.patch(block._id,{date:args.date,startMinute:start,endMinute:end,updatedAt:Date.now()});return null
}})
export const listDay=query({args:{date:v.string()},handler:async(ctx,{date})=>{
 await requireAdmin(ctx);if(!dateOk(date))return []
 return (await ctx.db.query('scheduleBlocks').withIndex('by_date',q=>q.eq('date',date)).collect()).filter(block=>block.kind!=='hold'||(block.expiresAt??0)>Date.now()).sort((a,b)=>a.startMinute-b.startMinute)
}})
export const listRange=query({args:{startDate:v.string(),endDate:v.string()},handler:async(ctx,args)=>{
 await requireAdmin(ctx)
 if(!dateOk(args.startDate)||!dateOk(args.endDate)||args.endDate<args.startDate)return []
 return (await ctx.db.query('scheduleBlocks').withIndex('by_date',q=>q.gte('date',args.startDate).lt('date',args.endDate)).collect())
  .filter(block=>block.kind!=='hold'||(block.expiresAt??0)>Date.now()).sort((a,b)=>a.date.localeCompare(b.date)||a.startMinute-b.startMinute)
}})
export const createBlock=mutation({args:{date:v.string(),startMinute:v.number(),endMinute:v.number(),title:v.string()},handler:async(ctx,args)=>{
 await requireAdmin(ctx)
 if(!Number.isInteger(args.startMinute)||!Number.isInteger(args.endMinute)||args.endMinute<=args.startMinute||args.title.trim().length>120)productError('BLOCK_INVALID','Enter a valid unavailable time and title.')
 validateWindow(args.date,args.startMinute,args.endMinute)
 if((await blocks(ctx,args.date)).some(block=>overlap(args.startMinute,args.endMinute,block.startMinute,block.endMinute)))productError('BLOCK_OVERLAP','This conflicts with an appointment or an existing block.')
 await ctx.db.insert('scheduleBlocks',{date:args.date,startMinute:args.startMinute,endMinute:args.endMinute,kind:'blocked',title:args.title.trim()||'Unavailable',createdAt:Date.now(),updatedAt:Date.now()});return null
}})
export const removeBlock=mutation({args:{id:v.id('scheduleBlocks')},handler:async(ctx,{id})=>{await requireAdmin(ctx);const block=await ctx.db.get(id);if(!block||block.kind!=='blocked')productError('BLOCK_MISSING','That unavailable time no longer exists.');await ctx.db.delete(id);return null}})
