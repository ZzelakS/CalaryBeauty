import { v } from 'convex/values'
import { paginationOptsValidator } from 'convex/server'
import { httpAction,internalMutation,internalQuery,internalAction,query,mutation } from './_generated/server'
import { internal } from './_generated/api'
import { requireAdmin } from './products'
import { productError } from '../shared/productErrors'
const consent='I agree to receive Calary Beauty news and offers by email. I can unsubscribe at any time.'
const success='Check your inbox for a confirmation link. If you have already subscribed, you’re all set.'
function config(){return {key:process.env.RESEND_NEWSLETTER_API_KEY || process.env.RESEND_API_KEY,from:process.env.NEWSLETTER_FROM || process.env.BOOKING_ALERT_FROM,site:process.env.SITE_URL,enabled:process.env.NEWSLETTER_ENABLED==='true',sync:process.env.RESEND_NEWSLETTER_SYNC==='true'}}
function headers(origin:string){return {'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}}
function allowedOrigin(request:Request){try{const site=new URL(process.env.SITE_URL || ''),origin=new URL(request.headers.get('Origin') || '');return site.protocol===origin.protocol && site.port===origin.port && site.hostname.replace(/^www\./,'')===origin.hostname.replace(/^www\./,'') ? origin.origin:null}catch{return null}}
function json(origin:string,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:headers(origin)})}
export const preflight=httpAction(async(_ctx,request)=>{const origin=allowedOrigin(request);return new Response(null,{status:origin ? 204:403,headers:headers(origin || 'null')})})
export const signup=httpAction(async(ctx,request)=>{
 const origin=allowedOrigin(request)
 if(!origin)return json('null',{ok:false,message:'Subscriptions are unavailable from this website.'},403)
 const cfg=config()
 if(!cfg.enabled || !cfg.key || !cfg.from || !cfg.site)return json(origin,{ok:false,message:'Email signup is not available yet. Please contact the studio.'},503)
 try{
  const raw=await request.text();if(raw.length>4096)return json(origin,{ok:false,message:'Please shorten your entry.'},400)
  const input:unknown=JSON.parse(raw)
  if(!input || typeof input!=='object')throw new Error('Invalid form.')
  const body=input as Record<string,unknown>
  if(body.website)return json(origin,{ok:true,message:success})
  const email=typeof body.email==='string' ? body.email.trim().toLowerCase():''
  if(email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || body.consent!==true)return json(origin,{ok:false,message:'Enter a valid email and agree to receive updates.'},400)
  const result=await ctx.runMutation(internal.newsletter.reserve,{email,token:crypto.randomUUID()+crypto.randomUUID()})
  if(result==='limited')return json(origin,{ok:false,message:'We’re receiving lots of requests. Please try again in an hour.'},429)
  return json(origin,{ok:true,message:success})
 }catch{return json(origin,{ok:false,message:'We could not save your request. Please try again shortly.'},400)}
})
export const reserve=internalMutation({args:{email:v.string(),token:v.string()},handler:async(ctx,{email,token})=>{
 const old=await ctx.db.query('newsletterSubscribers').withIndex('by_email',q=>q.eq('email',email)).unique()
 if(old?.status==='confirmed' || (old && Date.now()-old.lastRequestedAt<10*60000))return 'existing'
 const bucket=String(Math.floor(Date.now()/3600000)),limit=await ctx.db.query('newsletterLimits').withIndex('by_bucket',q=>q.eq('bucket',bucket)).unique()
 const configured=Number(process.env.NEWSLETTER_HOURLY_LIMIT || '60'),max=Number.isFinite(configured) && configured>0 ? Math.floor(configured):60
 if(limit && limit.count>=max)return 'limited'
 if(limit)await ctx.db.patch(limit._id,{count:limit.count+1});else await ctx.db.insert('newsletterLimits',{bucket,count:1})
 const values={email,status:'pending' as const,token,expiresAt:Date.now()+24*3600000,version:(old?.version ?? 0)+1,lastRequestedAt:Date.now(),consentText:consent,mailStatus:'queued' as const,syncStatus:'disabled' as const}
 let id
 if(old){id=old._id;await ctx.db.patch(id,{...values,mailError:'',syncError:''})}else id=await ctx.db.insert('newsletterSubscribers',{...values,createdAt:Date.now()})
 await ctx.scheduler.runAfter(0,internal.newsletter.sendConfirmation,{id,version:values.version})
 return 'queued'
}})
export const get=internalQuery({args:{id:v.id('newsletterSubscribers')},handler:async(ctx,{id})=>ctx.db.get(id)})
export const mailResult=internalMutation({args:{id:v.id('newsletterSubscribers'),version:v.number(),accepted:v.boolean(),error:v.optional(v.string())},handler:async(ctx,args)=>{
 const row=await ctx.db.get(args.id);if(row && row.version===args.version)await ctx.db.patch(row._id,{mailStatus:args.accepted ? 'accepted':'failed',mailError:args.error || ''});return null
}})
export const sendConfirmation=internalAction({args:{id:v.id('newsletterSubscribers'),version:v.number()},handler:async(ctx,{id,version})=>{
 const row=await ctx.runQuery(internal.newsletter.get,{id});if(!row || row.version!==version || row.status!=='pending' || row.mailStatus==='accepted' || row.expiresAt<Date.now())return null
 const cfg=config();let accepted=false,error='Email sending is not configured. Check the newsletter sender and Resend key.'
 if(cfg.enabled && cfg.key && cfg.from && cfg.site){
  const url=new URL('/subscribe/confirm',cfg.site);url.searchParams.set('token',row.token)
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000)
  try{
   const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:controller.signal,headers:{Authorization:`Bearer ${cfg.key}`,'Content-Type':'application/json','Idempotency-Key':`newsletter-confirm/${id}/${version}`},body:JSON.stringify({from:cfg.from,to:[row.email],subject:'Confirm your Calary Beauty updates',text:`Thanks for joining Calary Beauty.\n\nConfirm your email to receive collection news, restocks and studio offers:\n${url.href}\n\nThis link expires in 24 hours. If you did not request updates, ignore this message. You have not been subscribed yet.\n\nCalary Beauty\n31 Mountain Green Cir, Windsor Mill, MD 21244\ncalarybeautystore@gmail.com`})})
   const data=await response.json() as {id?:string};accepted=response.ok && Boolean(data.id);error=accepted ? '':`Resend did not accept the confirmation (HTTP ${response.status}). Check its logs, sender verification and API key.`
  }catch{error='Could not confirm email delivery. The visitor can request another confirmation after 10 minutes.'}finally{clearTimeout(timer)}
 }
 await ctx.runMutation(internal.newsletter.mailResult,{id,version,accepted,error});return null
}})
export const confirm=httpAction(async(ctx,request)=>{
 const origin=allowedOrigin(request);if(!origin)return json('null',{ok:false,message:'This confirmation is not available from this website.'},403)
 try{const input:unknown=await request.json();const token=input && typeof input==='object' && 'token' in input ? input.token:null;if(typeof token!=='string' || token.length!==72)return json(origin,{ok:false,message:'This confirmation link is invalid.'},400)
 const ok=await ctx.runMutation(internal.newsletter.confirmToken,{token});return json(origin,{ok,message:ok ? 'You’re subscribed. Look out for news from Calary Beauty.':'This link has expired or is invalid. Please subscribe again.'},ok ? 200:400)
 }catch{return json(origin,{ok:false,message:'We could not confirm your email. Please try again.'},400)}
})
export const confirmToken=internalMutation({args:{token:v.string()},handler:async(ctx,{token})=>{
 const row=await ctx.db.query('newsletterSubscribers').withIndex('by_token',q=>q.eq('token',token)).unique()
 if(!row || row.expiresAt<Date.now())return false
 if(row.status==='confirmed')return true
 const sync=process.env.RESEND_NEWSLETTER_SYNC==='true'
 await ctx.db.patch(row._id,{status:'confirmed',confirmedAt:Date.now(),syncStatus:sync ? 'pending':'disabled'})
 if(sync)await ctx.scheduler.runAfter(0,internal.newsletter.syncContact,{id:row._id})
 return true
}})
export const syncResult=internalMutation({args:{id:v.id('newsletterSubscribers'),success:v.boolean(),error:v.optional(v.string())},handler:async(ctx,args)=>{await ctx.db.patch(args.id,{syncStatus:args.success ? 'synced':'failed',syncError:args.error || ''});return null}})
export const syncContact=internalAction({args:{id:v.id('newsletterSubscribers')},handler:async(ctx,{id})=>{
 const row=await ctx.runQuery(internal.newsletter.get,{id});if(!row || row.status!=='confirmed' || row.syncStatus==='synced')return null
 const cfg=config();let success=false,error='Contact sync requires RESEND_NEWSLETTER_SYNC=true and a Resend key with contact access.'
 if(cfg.sync && cfg.key){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000)
  try{
   const auth={Authorization:`Bearer ${cfg.key}`,'Content-Type':'application/json'}
   // Existing contacts retain their unsubscribe/preferences. Never re-enable them on retry.
   const current=await fetch(`https://api.resend.com/contacts/${encodeURIComponent(row.email)}`,{headers:auth,signal:controller.signal})
   if(current.ok)success=true
   else if(current.status===404){
    const segment=process.env.RESEND_NEWSLETTER_SEGMENT_ID,topic=process.env.RESEND_NEWSLETTER_TOPIC_ID
    const response=await fetch('https://api.resend.com/contacts',{method:'POST',headers:auth,signal:controller.signal,body:JSON.stringify({email:row.email,unsubscribed:false,...(segment ? {segments:[{id:segment}]}:{}),...(topic ? {topics:[{id:topic,subscription:'opt_in'}]}:{})})})
    success=response.ok;error=`Contact sync failed (HTTP ${response.status}). Check Resend key permissions, segment and topic settings.`
   }else error=`Could not check the Resend contact (HTTP ${current.status}). Check API key permissions.`
  }catch{error='Could not reach Resend contacts. Retry sync from the dashboard.'}finally{clearTimeout(timer)}
 }
 await ctx.runMutation(internal.newsletter.syncResult,{id,success,error:success ? '':error});return null
}})
export const list=query({args:{paginationOpts:paginationOptsValidator},handler:async(ctx,args)=>{
 await requireAdmin(ctx);const page=await ctx.db.query('newsletterSubscribers').order('desc').paginate(args.paginationOpts)
 return {...page,page:page.page.map(s=>({id:s._id,email:s.email,status:s.status,createdAt:s.createdAt,confirmedAt:s.confirmedAt,mailStatus:s.mailStatus,mailError:s.mailError,syncStatus:s.syncStatus,syncError:s.syncError}))}
}})
export const retrySync=mutation({args:{id:v.id('newsletterSubscribers')},handler:async(ctx,{id})=>{
 await requireAdmin(ctx);const row=await ctx.db.get(id);if(!row || row.status!=='confirmed')productError('NOT_CONFIRMED','Only confirmed subscribers can be synced.')
 if(!config().sync)productError('SYNC_DISABLED','Enable RESEND_NEWSLETTER_SYNC on Convex first.')
 await ctx.db.patch(id,{syncStatus:'pending'});await ctx.scheduler.runAfter(0,internal.newsletter.syncContact,{id});return null
}})
export const settings=query({args:{},handler:async ctx=>{await requireAdmin(ctx);const c=config();return {enabled:c.enabled,senderConfigured:Boolean(c.from),keyConfigured:Boolean(c.key),siteConfigured:Boolean(c.site),contactSync:c.sync}}})
