import { v } from 'convex/values'
import { internalAction, internalMutation, internalQuery, mutation } from './_generated/server'
import { internal } from './_generated/api'
import { appointmentPayload } from '../shared/appointmentRecord'

function config(){return {key:process.env.RESEND_BOOKING_API_KEY||process.env.RESEND_API_KEY||process.env.RESEND_NEWSLETTER_API_KEY,from:process.env.BOOKING_ALERT_FROM||process.env.NEWSLETTER_FROM,site:process.env.SITE_URL,to:process.env.BOOKING_ALERT_TO||'calarybeautystore@gmail.com',enabled:process.env.BOOKING_EMAIL_ENABLED==='true'}}
export const get=internalQuery({args:{requestId:v.string()},handler:async(ctx,{requestId})=>ctx.db.query('paymentRecords').withIndex('by_requestId',q=>q.eq('requestId',requestId)).unique()})
export const markSent=internalMutation({args:{requestId:v.string()},handler:async(ctx,{requestId})=>{const row=await ctx.db.query('paymentRecords').withIndex('by_requestId',q=>q.eq('requestId',requestId)).unique();if(row)await ctx.db.patch(row._id,{updatedAt:Date.now()});return null}})
async function send(key:string,body:unknown){const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(`Resend rejected the email (${response.status}).`)}
function escapeHtml(value:string){return value.replace(/[&<>'\"]/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]||character))}
function customerConfirmationEmail({name,description,deposit,url}:{name:string;description:string;deposit:number;url:string}){const safeName=escapeHtml(name),safeDescription=escapeHtml(description),safeDeposit=escapeHtml(`$${deposit.toFixed(2)}`),safeUrl=escapeHtml(url)
 return `<!doctype html><html lang="en"><body style="margin:0;padding:0;background:#f4eee5;color:#1a1511;font-family:Arial,Helvetica,sans-serif;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your Calary Beauty appointment deposit was received. Please confirm your attendance.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4eee5;"><tr><td style="padding:36px 16px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;margin:0 auto;background:#fbf6ef;"><tr><td style="padding:32px 36px 22px;background:#1a1511;text-align:center;"><p style="margin:0;color:#c08a34;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Calary Beauty</p><h1 style="margin:12px 0 0;color:#fbf6ef;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:400;line-height:1.15;">Your appointment is reserved</h1></td></tr><tr><td style="padding:34px 36px 38px;"><p style="margin:0 0 18px;font-size:16px;line-height:1.65;">Hi ${safeName},</p><p style="margin:0 0 24px;font-size:16px;line-height:1.65;">Thank you — we received your ${safeDeposit} deposit. Please confirm that you can attend so the studio can prepare for you.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;background:#f4eee5;border-left:3px solid #c08a34;"><tr><td style="padding:18px 20px;"><p style="margin:0 0 7px;color:#6b5340;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;">Appointment details</p><p style="margin:0;color:#1a1511;font-size:16px;line-height:1.55;">${safeDescription}</p></td></tr></table><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 28px;"><tr><td align="center" bgcolor="#c08a34" style="border-radius:2px;"><a href="${safeUrl}" style="display:inline-block;padding:15px 25px;color:#1a1511;font-size:13px;font-weight:700;letter-spacing:.8px;text-decoration:none;text-transform:uppercase;">Confirm appointment</a></td></tr></table><p style="margin:0;font-size:14px;line-height:1.65;color:#6b5340;">Need a different time? Please contact the studio instead of making another booking.</p><p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #ddcdbb;color:#6b5340;font-size:13px;line-height:1.6;">Calary Beauty<br>31 Mountain Green Cir<br>Windsor Mill, MD 21244</p></td></tr></table></td></tr></table></body></html>`
}
export const sendPaidConfirmation=internalAction({args:{requestId:v.string()},handler:async(ctx,{requestId})=>{
 const row=await ctx.runQuery(internal.appointmentEmails.get,{requestId});if(!row||row.kind!=='booking'||row.status!=='paid')return null
 const cfg=config();if(!cfg.enabled||!cfg.key||!cfg.from||!cfg.site)return null
 const details=appointmentPayload(row.payload),token=row.appointmentConfirmationToken
 if(!token)return null
 const url=new URL('/appointment/confirm',cfg.site);url.searchParams.set('token',token)
 const description=`${details.serviceName} · ${details.booking.length} · ${row.appointmentDate??details.booking.date} at ${row.appointmentTime??details.booking.time} Eastern time`
 await Promise.all([
  send(cfg.key,{from:cfg.from,to:[details.customer.email],subject:'Please confirm your Calary Beauty appointment',text:`Thank you — your $${row.amount} deposit has been received.\n\nAppointment: ${description}\n\nPlease confirm your appointment by opening this link:\n${url.href}\n\nIf you need to change your time, contact the studio instead of booking another slot.\n\nCalary Beauty\n31 Mountain Green Cir, Windsor Mill, MD 21244`,html:customerConfirmationEmail({name:details.customer.billing.firstName,description,deposit:row.amount,url:url.href})}),
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
