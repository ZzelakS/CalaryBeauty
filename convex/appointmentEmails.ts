import { v } from 'convex/values'
import { internalAction, internalMutation, internalQuery, mutation } from './_generated/server'
import { internal } from './_generated/api'
import { appointmentPayload } from '../shared/appointmentRecord'

function config(){return {key:process.env.RESEND_BOOKING_API_KEY||process.env.RESEND_API_KEY||process.env.RESEND_NEWSLETTER_API_KEY,from:process.env.BOOKING_ALERT_FROM||process.env.NEWSLETTER_FROM,site:process.env.SITE_URL,to:process.env.BOOKING_ALERT_TO||'calarybeautystore@gmail.com',enabled:process.env.BOOKING_EMAIL_ENABLED==='true'}}
export const get=internalQuery({args:{requestId:v.string()},handler:async(ctx,{requestId})=>ctx.db.query('paymentRecords').withIndex('by_requestId',q=>q.eq('requestId',requestId)).unique()})
export const markSent=internalMutation({args:{requestId:v.string()},handler:async(ctx,{requestId})=>{const row=await ctx.db.query('paymentRecords').withIndex('by_requestId',q=>q.eq('requestId',requestId)).unique();if(row)await ctx.db.patch(row._id,{updatedAt:Date.now()});return null}})
async function send(key:string,body:unknown){const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(`Resend rejected the email (${response.status}).`)}
export const sendPaidConfirmation=internalAction({args:{requestId:v.string()},handler:async(ctx,{requestId})=>{
 const row=await ctx.runQuery(internal.appointmentEmails.get,{requestId});if(!row||row.kind!=='booking'||row.status!=='paid')return null
 const cfg=config();if(!cfg.enabled||!cfg.key||!cfg.from||!cfg.site)return null
 const details=appointmentPayload(row.payload),token=row.appointmentConfirmationToken
 if(!token)return null
 const url=new URL('/appointment/confirm',cfg.site);url.searchParams.set('token',token)
 const description=`${details.serviceName} · ${details.booking.length} · ${row.appointmentDate??details.booking.date} at ${row.appointmentTime??details.booking.time} Eastern time`
 await Promise.all([
  send(cfg.key,{from:cfg.from,to:[details.customer.email],subject:'Please confirm your Calary Beauty appointment',text:`Thank you — your $${row.amount} deposit has been received.\n\nAppointment: ${description}\n\nPlease confirm your appointment here:\n${url.href}\n\nIf you need to change your time, contact the studio instead of booking another slot.\n\nCalary Beauty\n31 Mountain Green Cir, Windsor Mill, MD 21244`}),
  send(cfg.key,{from:cfg.from,to:[cfg.to],subject:`New appointment: ${details.customer.billing.firstName} ${details.customer.billing.lastName}`,text:`A paid appointment needs studio review.\n\n${description}\nDeposit: $${row.amount}\nClient: ${details.customer.email} · ${details.customer.phone}\nConfirmation is pending from the client.`}),
 ])
 await ctx.runMutation(internal.appointmentEmails.markSent,{requestId});return null
}})
export const confirmByToken=mutation({args:{token:v.string(),response:v.union(v.literal('confirmed'),v.literal('declined'))},handler:async(ctx,{token,response})=>{
 if(token.length<40)throw new Error('This appointment link is invalid.')
 const records=await ctx.db.query('paymentRecords').withIndex('by_kind_status',q=>q.eq('kind','booking').eq('status','paid')).collect()
 const row=records.find(record=>record.appointmentConfirmationToken===token)
 if(!row)throw new Error('This appointment link is invalid or has expired.')
 await ctx.db.patch(row._id,{appointmentConfirmation:response,updatedAt:Date.now()})
 await ctx.scheduler.runAfter(0,internal.appointmentEmails.sendStudioResponse,{requestId:row.requestId,response})
 return response
}})
export const sendStudioResponse=internalAction({args:{requestId:v.string(),response:v.union(v.literal('confirmed'),v.literal('declined'))},handler:async(ctx,{requestId,response})=>{
 const row=await ctx.runQuery(internal.appointmentEmails.get,{requestId}),cfg=config();if(!row||!cfg.enabled||!cfg.key||!cfg.from)return null
 const details=appointmentPayload(row.payload);await send(cfg.key,{from:cfg.from,to:[cfg.to],subject:`Client ${response}: ${details.customer.billing.firstName} ${details.customer.billing.lastName}`,text:`The client has ${response} the appointment for ${row.appointmentDate??details.booking.date} at ${row.appointmentTime??details.booking.time} Eastern time.\n\nService: ${details.serviceName} · ${details.booking.length}\nClient: ${details.customer.email} · ${details.customer.phone}`});return null
}})
