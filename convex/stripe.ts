import { v } from 'convex/values'
import { httpAction, internalMutation, internalQuery, type ActionCtx } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { api, internal } from './_generated/api'
import { validateBooking } from '../shared/booking'
import type { Service } from '../shared/services'
import type { Product } from '../src/data/products'
import { parseCustomer } from '../shared/checkout'
import { PRODUCT_SHIPPING_FEE } from '../shared/pricing'
import { AFFIRM_MIN_CENTS, AFFIRM_MAX_CENTS, STRIPE_API_VERSION, cents, plainObject, stripeCheckoutUrl, verifyStripeSignature } from '../shared/stripe'

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const SESSION=/^cs_(test_|live_)?[a-zA-Z0-9]+$/
const integration='calary-affirm-v1'
function configuration(requireEnabled=false){
 const secret=process.env.STRIPE_SECRET_KEY || '',mode=process.env.STRIPE_MODE
 if((mode!=='test' && mode!=='live') || !secret.startsWith(`sk_${mode}_`) || !process.env.STRIPE_WEBHOOK_SECRET || (requireEnabled && process.env.STRIPE_ENABLED!=='true'))throw new Error('Stripe checkout is not available yet. Please contact the studio.')
 const site=new URL(process.env.SITE_URL || '')
 if(site.username || site.password || (site.protocol!=='https:' && !(mode==='test' && site.protocol==='http:' && ['localhost','127.0.0.1'].includes(site.hostname))))throw new Error('Stripe website address is not configured.')
 return {secret,site:site.origin,live:mode==='live'}
}
function cors(request:Request){
 const origin=request.headers.get('Origin'),configured=new URL(process.env.SITE_URL || '')
 const allowed=[configured.origin]
 if(configured.protocol==='https:'){
  const alias=new URL(configured.origin);alias.hostname=alias.hostname.startsWith('www.') ? alias.hostname.slice(4):`www.${alias.hostname}`;allowed.push(alias.origin)
 }
 if(!origin || !allowed.includes(origin))throw new Error('Open checkout from the Calary Beauty website.')
 return {'Content-Type':'application/json','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin','Cache-Control':'no-store'}
}
const reply=(body:Record<string,unknown>,status:number,headers:Record<string,string>={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}})
class StripeFailure extends Error { constructor(public safeToRetry:boolean){super('Stripe could not open checkout. Check that Affirm is enabled for this Stripe account, or contact the studio.')} }
async function stripeRequest(path:string,method='GET',params?:string,idempotency?:string):Promise<Record<string,unknown>>{
 const {secret}=configuration()
 const response=await fetch(`https://api.stripe.com/v1${path}`,{method,headers:{Authorization:`Bearer ${secret}`,'Stripe-Version':STRIPE_API_VERSION,...(params!==undefined ? {'Content-Type':'application/x-www-form-urlencoded'}:{}),...(idempotency ? {'Idempotency-Key':idempotency}:{})},...(params!==undefined ? {body:params}:{}),signal:AbortSignal.timeout(20000)})
 if(!response.ok){
  // No provider response bodies (which may contain private details) reach the browser.
  console.error('[Stripe] request failed',response.status,response.headers.get('request-id'))
  throw new StripeFailure(response.status>=400 && response.status<500 && ![409,429].includes(response.status))
 }
 return plainObject(await response.json())
}
async function body(request:Request){
 const raw=await request.text();if(raw.length>32768)throw new Error('Checkout details are too large.')
 return plainObject(JSON.parse(raw))
}
function reference(input:Record<string,unknown>){
 if(typeof input.requestId!=='string' || !UUID.test(input.requestId) || typeof input.token!=='string' || !UUID.test(input.token))throw new Error('Invalid checkout reference. Contact the studio if you already attempted payment.')
 return {requestId:input.requestId,token:input.token}
}
export const preflight=httpAction(async(_ctx,request)=>{try{return new Response(null,{status:204,headers:cors(request)})}catch{return reply({ok:false},403)}})

export const reserve=internalMutation({args:{requestId:v.string(),token:v.string(),customer:v.string(),items:v.string(),method:v.union(v.literal('card'),v.literal('affirm')),booking:v.optional(v.string())},handler:async(ctx,args):Promise<Doc<'paymentRecords'>>=>{
 const config=configuration(true)
 const fingerprint=JSON.stringify({customer:args.customer,items:args.items,method:args.method,booking:args.booking ?? null})
 const existing=await ctx.db.query('paymentRecords').withIndex('by_requestId',q=>q.eq('requestId',args.requestId)).unique()
 if(existing){
  if(existing.provider!=='stripe' || existing.stripeToken!==args.token || existing.stripeRequest!==fingerprint)throw new Error('This checkout reference is already in use. Review the pending payment before trying again.')
  return existing
 }
 if(args.method==='affirm' && (process.env.STRIPE_AFFIRM_ENABLED!=='true' || args.booking!==undefined))throw new Error('Affirm is available for enabled product purchases only.')
 const customer=parseCustomer(JSON.parse(args.customer),args.booking===undefined)
 if(args.method==='affirm' && (customer.billing.country!=='US' || customer.shipping?.country!=='US'))throw new Error('Affirm is available for US billing and delivery addresses only. Choose another payment method.')
 const input:unknown=JSON.parse(args.items)
 if(!args.booking && (!Array.isArray(input) || !input.length || input.length>30))throw new Error('Check the items in your bag.')
 const products:Product[]=args.booking ? []:await ctx.runQuery(api.products.listPublic,{})
 let booking:ReturnType<typeof validateBooking>|undefined
 if(args.booking){
  if(Array.isArray(input) && input.length)throw new Error('Choose one checkout type.')
  const catalog:{services:Service[];extras:{name:string;price:number}[]}=await ctx.runQuery(api.services.listPublic,{})
  booking=validateBooking(JSON.parse(args.booking),new Date(),catalog)
 }
 const seen=new Set<string>()
 const items=(Array.isArray(input) ? input:[]).map(value=>{
  const item=plainObject(value)
  if(typeof item.productId!=='string' || !Number.isInteger(item.quantity) || Number(item.quantity)<1 || Number(item.quantity)>99)throw new Error('Check the product quantities in your bag.')
  const product=products.find(p=>p.id===item.productId)
  if(!product || product.inStock===false)throw new Error('An item in your bag is out of stock or no longer available. Review your bag.')
  if(product.lengths?.length && (typeof item.length!=='string' || !product.lengths.includes(item.length)))throw new Error('Choose a valid product length.')
  if(item.length!==undefined && (typeof item.length!=='string' || item.length.length>100))throw new Error('Choose a valid product length.')
  const key=JSON.stringify([product.id,item.length ?? '']);if(seen.has(key))throw new Error('Duplicate items in your bag. Reload and try again.');seen.add(key)
  return {productId:product.id,name:product.name,length:typeof item.length==='string' ? item.length:'',quantity:Number(item.quantity),unitPrice:product.price,unitAmount:cents(product.price)}
 })
 const shipping=booking ? 0:cents(PRODUCT_SHIPPING_FEE),amount=booking ? cents(booking.deposit):items.reduce((sum,item)=>sum+item.unitAmount*item.quantity,shipping)
 if(!Number.isSafeInteger(amount) || amount<50 || amount>99999999 || (args.method==='affirm' && (amount<AFFIRM_MIN_CENTS || amount>AFFIRM_MAX_CENTS)))throw new Error('Affirm is available for product orders from $35 to $30,000 including shipping. Choose another payment method.')
 const bucket=Math.floor(Date.now()/3600000)
 const limit=await ctx.db.query('stripeLimits').withIndex('by_bucket',q=>q.eq('bucket',bucket)).unique()
 if((limit?.count ?? 0)>=60)throw new Error('Secure checkout is busy. Please try again later or choose another payment method.')
 if(limit)await ctx.db.patch(limit._id,{count:limit.count+1});else await ctx.db.insert('stripeLimits',{bucket,count:1})
 const expiresAt=Math.floor(Date.now()/1000)+3600
 const returnUrl=new URL('/stripe-return',config.site);returnUrl.searchParams.set('reference',args.requestId);returnUrl.hash=`token=${args.token}`
 const cancelUrl=new URL(returnUrl);cancelUrl.searchParams.set('cancelled','1')
 const params=new URLSearchParams({mode:'payment','payment_method_types[0]':args.method,success_url:returnUrl.href,cancel_url:cancelUrl.href,client_reference_id:args.requestId,customer_email:customer.email,billing_address_collection:'required','phone_number_collection[enabled]':'true',expires_at:String(expiresAt),'metadata[integration]':integration,'metadata[requestId]':args.requestId,'payment_intent_data[metadata][integration]':integration,'payment_intent_data[metadata][requestId]':args.requestId,'shipping_options[0][shipping_rate_data][type]':'fixed_amount','shipping_options[0][shipping_rate_data][fixed_amount][amount]':String(shipping),'shipping_options[0][shipping_rate_data][fixed_amount][currency]':'usd','shipping_options[0][shipping_rate_data][display_name]':'Flat shipping'})
 if(booking){
  for(const key of [...params.keys()])if(key.startsWith('shipping_options'))params.delete(key)
  params.set('line_items[0][price_data][currency]','usd');params.set('line_items[0][price_data][unit_amount]',String(amount));params.set('line_items[0][price_data][product_data][name]','Appointment deposit');params.set('line_items[0][price_data][product_data][description]',`${booking.serviceName} · ${booking.booking.length} · ${booking.booking.date} ${booking.booking.time} Eastern time`);params.set('line_items[0][quantity]','1')
 }else params.set('shipping_address_collection[allowed_countries][0]',customer.shipping!.country)
 items.forEach((item,index)=>{
  const prefix=`line_items[${index}]`
  params.set(`${prefix}[price_data][currency]`,'usd');params.set(`${prefix}[price_data][unit_amount]`,String(item.unitAmount));params.set(`${prefix}[price_data][product_data][name]`,[item.name,item.length].filter(Boolean).join(' · ').slice(0,250));params.set(`${prefix}[quantity]`,String(item.quantity))
 })
 const id=await ctx.db.insert('paymentRecords',{requestId:args.requestId,kind:booking ? 'booking':'order',provider:'stripe',stripeMethod:args.method,status:'processing',amount:amount/100,payload:JSON.stringify({customer,items,...(booking ? {booking:booking.booking,serviceTotal:booking.total,serviceName:booking.serviceName,timeZone:'America/New_York'}:{shippingAmount:PRODUCT_SHIPPING_FEE})}),stripeRequest:fingerprint,stripeToken:args.token,stripeParams:params.toString(),stripeExpiresAt:expiresAt,stripeLiveMode:config.live,updatedAt:Date.now()})
 return (await ctx.db.get(id))!
}})
export const getRecord=internalQuery({args:{requestId:v.string()},handler:async(ctx,{requestId})=>ctx.db.query('paymentRecords').withIndex('by_requestId',q=>q.eq('requestId',requestId)).unique()})
export const attachSession=internalMutation({args:{requestId:v.string(),sessionId:v.string()},returns:v.null(),handler:async(ctx,args)=>{
 const record=await ctx.db.query('paymentRecords').withIndex('by_requestId',q=>q.eq('requestId',args.requestId)).unique()
 if(!record || record.provider!=='stripe' || (record.stripeSessionId && record.stripeSessionId!==args.sessionId))throw new Error('Stripe checkout does not match the order.')
 await ctx.db.patch(record._id,{stripeSessionId:args.sessionId});return null
}})
export const rejectSession=internalMutation({args:{requestId:v.string()},returns:v.null(),handler:async(ctx,{requestId})=>{
 const record=await ctx.db.query('paymentRecords').withIndex('by_requestId',q=>q.eq('requestId',requestId)).unique()
 if(record?.provider==='stripe' && !record.stripeSessionId && record.status!=='paid')await ctx.db.patch(record._id,{status:'declined',updatedAt:Date.now()})
 return null
}})
function validateSession(record:Doc<'paymentRecords'>,session:Record<string,unknown>){
 const metadata=plainObject(session.metadata)
 if(session.object!=='checkout.session' || session.mode!=='payment' || session.client_reference_id!==record.requestId || metadata.requestId!==record.requestId || metadata.integration!==integration || session.currency!=='usd' || session.amount_total!==Math.round(record.amount*100) || session.livemode!==record.stripeLiveMode || !Array.isArray(session.payment_method_types) || !session.payment_method_types.includes(record.stripeMethod || 'affirm') || (record.stripeSessionId && session.id!==record.stripeSessionId))throw new Error('Stripe payment does not match the saved order. Contact the studio before paying again.')
}
export const applySession=internalMutation({args:{requestId:v.string(),session:v.string()},returns:v.null(),handler:async(ctx,args)=>{
 const record=await ctx.db.query('paymentRecords').withIndex('by_requestId',q=>q.eq('requestId',args.requestId)).unique()
 if(!record || record.provider!=='stripe')throw new Error('Stripe order could not be found.')
 const session=plainObject(JSON.parse(args.session));validateSession(record,session)
 if(typeof session.id!=='string' || !SESSION.test(session.id))throw new Error('Invalid Stripe session.')
 if(session.payment_status==='paid' && session.status==='complete'){
  if(typeof session.payment_intent!=='string' || !session.payment_intent.startsWith('pi_'))throw new Error('Stripe payment reference is missing.')
  const customer=plainObject(session.customer_details),billing=plainObject(customer.address)
  let shipping:Record<string,unknown>|undefined
  if(record.kind==='order'){
   shipping=plainObject(session.shipping_details ?? (session.collected_information as Record<string,unknown>|undefined)?.shipping_details);const address=plainObject(shipping.address)
   if((record.stripeMethod==='affirm' && (billing.country!=='US' || address.country!=='US')) || typeof shipping.name!=='string' || !address.line1 || !address.city || !address.postal_code)throw new Error('Stripe delivery details need review. Contact the studio.')
  }
  const payload=plainObject(JSON.parse(record.payload))
  await ctx.db.patch(record._id,{status:'paid',transactionId:session.payment_intent,stripeSessionId:session.id,payload:JSON.stringify({...payload,stripeCustomerDetails:customer,...(shipping ? {stripeShippingDetails:shipping}:{})}),updatedAt:Date.now()})
 }else if(record.status!=='paid'){
  await ctx.db.patch(record._id,{stripeSessionId:session.id,status:session.status==='expired' ? 'declined':'processing',updatedAt:Date.now()})
 }
 return null
}})
async function ensureSession(ctx:ActionCtx,record:Doc<'paymentRecords'>):Promise<Record<string,unknown>>{
 if(record.stripeSessionId)return stripeRequest(`/checkout/sessions/${encodeURIComponent(record.stripeSessionId)}`)
 // Stripe retains idempotency keys for at least 24h. Never recreate an uncertain session later.
 if(Date.now()-record._creationTime>23*3600000 || !record.stripeParams)throw new Error('This checkout needs review. Contact the studio with your reference before paying again.')
 const session=await stripeRequest('/checkout/sessions','POST',record.stripeParams,`calary-affirm-${record.requestId}`)
 validateSession(record,session)
 if(typeof session.id!=='string' || !SESSION.test(session.id))throw new Error('Stripe returned an invalid checkout reference.')
 await ctx.runMutation(internal.stripe.attachSession,{requestId:record.requestId,sessionId:session.id})
 return session
}
export const createCheckout=httpAction(async(ctx,request)=>{
 let headers:Record<string,string>={},requestId='',reserved=false,hasSession=false
 try{headers=cors(request)}catch{return reply({ok:false,message:'Open checkout from the Calary Beauty website.',retryable:true},403)}
 try{
  configuration(true)
  const input=await body(request),ref=reference(input);requestId=ref.requestId
  if(input.method!=='card' && input.method!=='affirm')throw new Error('Choose a valid payment method.')
  if(input.booking!==undefined && input.items!==undefined)throw new Error('Choose one checkout type.')
  const customer=parseCustomer(input.customer,input.booking===undefined)
  const record:Doc<'paymentRecords'>=await ctx.runMutation(internal.stripe.reserve,{...ref,customer:JSON.stringify(customer),items:JSON.stringify(input.items ?? null),method:input.method,...(input.booking!==undefined ? {booking:JSON.stringify(input.booking)}:{})})
  reserved=true;hasSession=Boolean(record.stripeSessionId)
  if(record.status==='declined')return reply({ok:false,message:'This checkout has ended. You can start a new checkout.',retryable:true},409,headers)
  const session=await ensureSession(ctx,record)
  await ctx.runMutation(internal.stripe.applySession,{requestId,session:JSON.stringify(session)})
  if(session.payment_status==='paid')return reply({ok:true,paid:true},200,headers)
  if(session.status!=='open')return reply({ok:false,message:'This checkout is no longer open. Review its payment status.',retryable:false},409,headers)
  return reply({ok:true,url:stripeCheckoutUrl(session.url)},200,headers)
 }catch(error){
  const safe=!reserved || (!hasSession && error instanceof StripeFailure && error.safeToRetry)
  if(reserved && safe)await ctx.runMutation(internal.stripe.rejectSession,{requestId})
  return reply({ok:false,message:safe && error instanceof Error ? error.message:'We could not confirm the Stripe checkout result. Review the pending checkout before starting another payment.',retryable:safe},safe ? 400:503,headers)
 }
})
export const checkoutStatus=httpAction(async(ctx,request)=>{
 let headers:Record<string,string>={}
 try{headers=cors(request)}catch{return reply({ok:false,message:'Open checkout from the Calary Beauty website.'},403)}
 try{
  configuration()
  const input=await body(request),ref=reference(input)
  const record:Doc<'paymentRecords'>|null=await ctx.runQuery(internal.stripe.getRecord,{requestId:ref.requestId})
  if(!record || record.provider!=='stripe' || record.stripeToken!==ref.token)return reply({ok:false,message:'Checkout could not be verified. Contact the studio with your reference.'},404,headers)
  if(record.status==='declined' && !record.stripeSessionId)return reply({ok:true,status:'expired',amount:record.amount},200,headers)
  let session=await ensureSession(ctx,record)
  validateSession(record,session)
  if(input.cancel===true && session.status==='open'){
   try{session=await stripeRequest(`/checkout/sessions/${encodeURIComponent(String(session.id))}/expire`,'POST','',`calary-expire-${record.requestId}`)}catch{session=await stripeRequest(`/checkout/sessions/${encodeURIComponent(String(session.id))}`)}
  }
  await ctx.runMutation(internal.stripe.applySession,{requestId:record.requestId,session:JSON.stringify(session)})
  const status=session.payment_status==='paid' && session.status==='complete' ? 'paid':session.status==='expired' ? 'expired':session.status==='open' ? 'open':'pending'
  return reply({ok:true,status,kind:record.kind,message:record.kind==='booking' ? (()=>{const p=JSON.parse(record.payload);return `Your appointment is booked for ${p.booking.date} at ${p.booking.time} (America/New_York). Your $${record.amount} deposit is paid.`})():'Your product order has been received.',amount:record.amount,...(status==='paid' ? {transactionId:session.payment_intent}:{}),...(status==='open' ? {url:stripeCheckoutUrl(session.url)}:{})},200,headers)
 }catch{return reply({ok:false,message:'Payment status could not be verified. Keep your reference and contact the studio before paying again.'},503,headers)}
})
export const applyRefund=internalMutation({args:{requestId:v.string(),paymentIntent:v.string(),amount:v.number(),refunded:v.number(),live:v.boolean()},returns:v.null(),handler:async(ctx,args)=>{
 const record=await ctx.db.query('paymentRecords').withIndex('by_requestId',q=>q.eq('requestId',args.requestId)).unique()
 if(!record || record.provider!=='stripe' || record.stripeLiveMode!==args.live || Math.round(record.amount*100)!==args.amount || (record.transactionId && record.transactionId!==args.paymentIntent) || !Number.isSafeInteger(args.refunded) || args.refunded<0 || args.refunded>args.amount)throw new Error('Refund does not match this Stripe order.')
 await ctx.db.patch(record._id,{stripeRefundedAmount:Math.max(record.stripeRefundedAmount ?? 0,args.refunded),updatedAt:Date.now()});return null
}})
export const webhook=httpAction(async(ctx,request)=>{
 const secret=process.env.STRIPE_WEBHOOK_SECRET
 if(!secret)return reply({ok:false},503)
 const raw=await request.text()
 if(raw.length>262144 || !await verifyStripeSignature(raw,request.headers.get('Stripe-Signature'),secret))return reply({ok:false},400)
 try{
  const event=plainObject(JSON.parse(raw))
  if(typeof event.type!=='string' || typeof event.id!=='string')return reply({ok:false},400)
  const object=plainObject(plainObject(event.data).object)
  let metadata=plainObject(object.metadata ?? {})
  if(event.type==='charge.refunded' && typeof object.payment_intent==='string' && /^pi_[a-zA-Z0-9]+$/.test(object.payment_intent)){
   const intent=await stripeRequest(`/payment_intents/${encodeURIComponent(object.payment_intent)}`);metadata=plainObject(intent.metadata ?? {})
  }
  if(metadata.integration!==integration)return reply({received:true},200)
  if(typeof metadata.requestId!=='string' || !UUID.test(metadata.requestId))return reply({ok:false},400)
  if(['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','checkout.session.expired'].includes(event.type)){
   if(typeof object.id!=='string' || !SESSION.test(object.id))return reply({ok:false},400)
   const record:Doc<'paymentRecords'>|null=await ctx.runQuery(internal.stripe.getRecord,{requestId:metadata.requestId})
   if(!record || record.provider!=='stripe')throw new Error('Stripe order missing.')
   // Fetch current state rather than applying a possibly stale or out-of-order event snapshot.
   const session=await stripeRequest(`/checkout/sessions/${encodeURIComponent(object.id)}`)
   await ctx.runMutation(internal.stripe.applySession,{requestId:record.requestId,session:JSON.stringify(session)})
  }else if(event.type==='charge.refunded'){
   if(typeof object.payment_intent!=='string' || typeof object.amount!=='number' || typeof object.amount_refunded!=='number' || object.currency!=='usd' || typeof object.livemode!=='boolean')return reply({ok:false},400)
   await ctx.runMutation(internal.stripe.applyRefund,{requestId:metadata.requestId,paymentIntent:object.payment_intent,amount:object.amount,refunded:object.amount_refunded,live:object.livemode})
  }
  return reply({received:true},200)
 }catch(error){console.error('[Stripe] event requires retry',error instanceof Error ? error.message:'Processing failed');return reply({ok:false},500)}
})
