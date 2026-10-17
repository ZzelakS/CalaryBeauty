import { PRODUCT_SHIPPING_FEE } from '../shared/pricing'
import { httpAction, internalMutation } from './_generated/server'
import { api, internal } from './_generated/api'
import { v } from 'convex/values'
import { parseCustomer, gatewayAddress } from '../shared/checkout'
import { validateBooking } from '../shared/booking'
import { DEPOSIT } from '../shared/services'

const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}
const json=(body:Record<string,unknown>,status=200)=>new Response(JSON.stringify(body),{status,headers})
type Claim = {status:'new'|'paid'|'blocked';transactionId?:string}
export const claimPayment = internalMutation({
  args:{requestId:v.string(),payload:v.string(),kind:v.union(v.literal('order'),v.literal('booking')),amount:v.number()},
  returns:v.object({status:v.union(v.literal('new'),v.literal('paid'),v.literal('blocked')),transactionId:v.optional(v.string())}),
  handler:async(ctx,args):Promise<Claim>=>{
    const existing=await ctx.db.query('paymentRecords').withIndex('by_requestId',q=>q.eq('requestId',args.requestId)).unique()
    if(existing){
      if(existing.payload!==args.payload)return {status:'blocked'}
      return existing.status==='paid' ? {status:'paid',transactionId:existing.transactionId} : {status:'blocked'}
    }
    await ctx.db.insert('paymentRecords',{...args,status:'processing',updatedAt:Date.now()})
    return {status:'new'}
  }
})
export const finishPayment = internalMutation({
  args:{requestId:v.string(),status:v.union(v.literal('paid'),v.literal('declined'),v.literal('unknown')),transactionId:v.optional(v.string())}, returns:v.null(),
  handler:async(ctx,args)=>{
    const record=await ctx.db.query('paymentRecords').withIndex('by_requestId',q=>q.eq('requestId',args.requestId)).unique()
    if(!record)throw new Error('Payment record missing.')
    await ctx.db.patch(record._id,{status:args.status,...(args.transactionId ? {transactionId:args.transactionId}:{}),updatedAt:Date.now()})
    return null
  }
})
export const processPayment=httpAction(async(ctx,request)=>{
  let requestId='',claimed=false,submitted=false
  try {
    const body=await request.json()
    if(typeof body.requestId!=='string' || !/^[a-f0-9-]{36}$/i.test(body.requestId))return json({ok:false,message:'Invalid checkout reference.',retryable:true},400)
    requestId=body.requestId
    const customer=parseCustomer(body.customer, body.booking === undefined)
    const payment=body.payment
    const paypal=body.method==='paypal'
    if(paypal && process.env.AUTHORIZENET_PAYPAL_ENABLED!=='true')return json({ok:false,message:'PayPal is not available yet.',retryable:true},503)
    if(payment?.dataDescriptor==='COMMON.APPLE.INAPP.PAYMENT' && process.env.AUTHORIZENET_APPLE_PAY_ENABLED!=='true')return json({ok:false,message:'Apple Pay is not available yet.',retryable:true},503)
    if(!paypal && (!payment || !['COMMON.ACCEPT.INAPP.PAYMENT','COMMON.APPLE.INAPP.PAYMENT'].includes(payment.dataDescriptor) || typeof payment.dataValue!=='string' || !payment.dataValue || payment.dataValue.length>8192))return json({ok:false,message:'Invalid secure payment token.',retryable:true},400)
    let total=0, description='Calary Beauty order'
    const lineItems:{itemId:string;name:string;description:string;quantity:string;unitPrice:string}[]=[]
    let booking:ReturnType<typeof validateBooking>|undefined
    const normalizedItems:{productId:string;quantity:number;length?:string}[]=[]
    if(body.booking!==undefined){
      if(body.items!==undefined)return json({ok:false,message:'Choose one checkout type.',retryable:true},400)
      booking=validateBooking(body.booking,new Date(),await ctx.runQuery(api.services.listPublic))
      total=DEPOSIT // Always server-enforced, never accepted from client input.
      lineItems.push({itemId:'appointment-deposit',name:'Appointment deposit',description:`${booking.serviceName} · ${booking.booking.length}`.slice(0,255),quantity:'1',unitPrice:'50.00'})
      description=`Deposit: ${booking.serviceName} ${booking.booking.date} ${booking.booking.time} ET`.slice(0,255)
    } else {
      if(!Array.isArray(body.items) || !body.items.length || body.items.length>30)throw new Error('Check the items in your bag.')
      const products=await ctx.runQuery(api.products.listPublic)
      for(const item of body.items){
        if(!item || typeof item.productId!=='string' || !Number.isInteger(item.quantity) || item.quantity<1 || item.quantity>99)throw new Error('Invalid cart information.')
        const product=products.find(p=>p.id===item.productId)
        if(!product)throw new Error('An item in your bag is no longer available.')
        if(product.inStock===false)throw new Error(`${product.name} is out of stock. Remove it from your bag before checking out.`)
        if(product.lengths?.length && (typeof item.length!=='string' || !product.lengths.includes(item.length)))throw new Error('Choose a valid product length.')
        if(item.length!=null && typeof item.length!=='string')throw new Error('Invalid product selection.')
        lineItems.push({itemId:product.id.slice(0,31),name:product.name.slice(0,31),description:[product.subtitle,item.length].filter(Boolean).join(' · ').slice(0,255),quantity:String(item.quantity),unitPrice:product.price.toFixed(2)})
        total+=product.price*item.quantity
        normalizedItems.push({productId:product.id,quantity:item.quantity,...(item.length ? {length:item.length}:{})})
      }
    }
    if(!booking)total+=PRODUCT_SHIPPING_FEE
    if(!Number.isFinite(total) || total<=0)throw new Error('Invalid checkout total.')
    const apiLoginId=process.env.AUTHORIZENET_API_LOGIN_ID, transactionKey=process.env.AUTHORIZENET_TRANSACTION_KEY
    if(!apiLoginId || !transactionKey)return json({ok:false,message:'Payment service is not configured. Please contact Calary Beauty.',retryable:true},503)
    const payload=JSON.stringify({customer,items:normalizedItems,...(booking ? {booking:booking.booking,serviceTotal:booking.total,serviceName:booking.serviceName,timeZone:'America/New_York'}:{}),...(booking ? {} : {shippingAmount:PRODUCT_SHIPPING_FEE})})
    const claim:Claim=await ctx.runMutation(internal.payments.claimPayment,{requestId,payload,kind:booking ? 'booking':'order',amount:total})
    const successMessage=booking ? `Your appointment is booked for ${booking.booking.date} at ${booking.booking.time} (America/New_York). Your $50 deposit is paid.` : 'Payment successful. Your order details have been received.'
    if(claim.status==='paid')return json({ok:true,message:successMessage,transactionId:claim.transactionId})
    if(claim.status!=='new')return json({ok:false,message:'This payment is already being processed or requires review. Contact the studio before trying again.',retryable:false},409)
    claimed=true
    const sandbox=process.env.AUTHORIZENET_ENV==='sandbox'
    const walletState=paypal ? crypto.randomUUID():''
    let successUrl='',cancelUrl=''
    if(paypal){
      const site=new URL(process.env.SITE_URL || '')
      if(site.protocol!=='https:')throw new Error('PayPal needs a configured HTTPS website address.')
      const success=new URL('/wallet-return',site.origin),cancel=new URL('/wallet-return',site.origin)
      for(const url of [success,cancel]){url.searchParams.set('reference',requestId);url.searchParams.set('state',walletState)}
      success.searchParams.set('result','approved');cancel.searchParams.set('result','cancelled')
      successUrl=success.href;cancelUrl=cancel.href
    }
    const transactionRequest={
      transactionType:'authCaptureTransaction',amount:total.toFixed(2),...(paypal ? {currencyCode:'USD'}:{}),payment:paypal ? {payPal:{successUrl,cancelUrl}} : {opaqueData:payment},
      order:{invoiceNumber:`CB-${requestId.replace(/-/g,'').slice(0,16)}`,description},
      lineItems:{lineItem:lineItems},
      ...(!booking ? {shipping:{amount:PRODUCT_SHIPPING_FEE.toFixed(2),name:'Shipping',description:'Flat shipping fee'}} : {}),
      customer:{type:'individual',email:customer.email},
      billTo:{...gatewayAddress(customer.billing),phoneNumber:customer.phone},...(customer.shipping ? {shipTo:gatewayAddress(customer.shipping)} : {}),
      retail:{marketType:'0'},
      transactionSettings:{setting:[{settingName:'duplicateWindow',settingValue:'120'}]},
      userFields:{userField:[{name:'checkoutReference',value:requestId},...(booking ? [{name:'appointmentDate',value:booking.booking.date},{name:'appointmentTime',value:booking.booking.time},{name:'studioTimezone',value:'America/New_York'},{name:'service',value:booking.serviceName},{name:'length',value:booking.booking.length},{name:'extras',value:booking.booking.extras.join(', ') || 'None'}]:[])]},
    }
    submitted=true
    const response=await fetch(sandbox ? 'https://apitest.authorize.net/xml/v1/request.api':'https://api.authorize.net/xml/v1/request.api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({createTransactionRequest:{merchantAuthentication:{name:apiLoginId,transactionKey},transactionRequest}})})
    const data=JSON.parse((await response.text()).replace(/^\uFEFF/,'')) as {messages?:{resultCode?:string;message?:{text?:string}[]};transactionResponse?:{responseCode?:string;transId?:string;secureAcceptance?:{SecureAcceptanceUrl?:string};errors?:{errorText?:string}[]}}
    const transaction=data.transactionResponse
    if(paypal && data.messages?.resultCode==='Ok' && transaction?.transId && transaction.transId!=='0' && transaction.secureAcceptance?.SecureAcceptanceUrl){
      const redirect=new URL(transaction.secureAcceptance.SecureAcceptanceUrl)
      if(redirect.protocol!=='https:' || !(redirect.hostname==='paypal.com' || redirect.hostname.endsWith('.paypal.com')))throw new Error('Unexpected PayPal checkout address.')
      await ctx.runMutation(internal.payments.preparePaypal,{requestId,walletState,paypalReference:transaction.transId})
      return json({ok:true,pending:true,redirectUrl:redirect.href,message:'Continue at PayPal to approve your payment.'})
    }
    if(paypal)throw new Error('PayPal checkout could not be initialized.')
    if(data.messages?.resultCode==='Ok' && transaction?.responseCode==='1' && transaction.transId && transaction.transId!=='0'){
      // Preserve the approved result even if record finalization temporarily fails.
      try {await ctx.runMutation(internal.payments.finishPayment,{requestId,status:'paid',transactionId:transaction.transId})}catch{console.error('[Calary] Payment record needs reconciliation',requestId,transaction.transId)}
      return json({ok:true,message:successMessage,transactionId:transaction.transId})
    }
    const declined=transaction?.responseCode==='2'
    await ctx.runMutation(internal.payments.finishPayment,{requestId,status:declined ? 'declined':'unknown',...(transaction?.transId && transaction.transId!=='0' ? {transactionId:transaction.transId}:{})})
    return json({ok:false,message:declined ? transaction?.errors?.[0]?.errorText || 'Payment was declined. Please check your payment details.' : 'Payment requires review. Contact the studio with your checkout reference before trying again.',retryable:declined,reference:requestId},400)
  }catch(error){
    if(claimed){try{await ctx.runMutation(internal.payments.finishPayment,{requestId,status:'unknown'})}catch{ /* already protected by the processing record */ }}
    return json({ok:false,message:submitted ? `Payment outcome could not be verified. Contact the studio with reference ${requestId} before trying again.` : error instanceof Error ? error.message : 'Check your checkout details.',retryable:!submitted},submitted ? 502:400)
  }
})

export const preparePaypal=internalMutation({
  args:{requestId:v.string(),walletState:v.string(),paypalReference:v.string()},returns:v.null(),
  handler:async(ctx,args)=>{const record=await ctx.db.query('paymentRecords').withIndex('by_requestId',q=>q.eq('requestId',args.requestId)).unique();if(!record)throw new Error('Missing checkout.');await ctx.db.patch(record._id,{walletState:args.walletState,paypalReference:args.paypalReference});return null}
})
export const claimPaypal=internalMutation({
  args:{requestId:v.string(),state:v.string()},
  handler:async(ctx,args)=>{
    const record=await ctx.db.query('paymentRecords').withIndex('by_requestId',q=>q.eq('requestId',args.requestId)).unique()
    if(!record || record.walletState!==args.state || !record.paypalReference || record.updatedAt<Date.now()-30*60*1000)throw new Error('This PayPal checkout has expired or cannot be verified. Contact the studio before paying again.')
    if(record.status==='paid')return {paid:true,transactionId:record.transactionId,kind:record.kind}
    if(record.status!=='processing' || record.walletClaimed)throw new Error('This payment requires review. Contact the studio before trying again.')
    await ctx.db.patch(record._id,{walletClaimed:true})
    return {paid:false,reference:record.paypalReference,amount:record.amount,kind:record.kind}
  }
})
export const completePaypal=httpAction(async(ctx,request)=>{
  let requestId='',submitted=false
  try{
    if(process.env.AUTHORIZENET_PAYPAL_ENABLED!=='true')return json({ok:false,message:'PayPal is not available yet.',retryable:true},503)
    const body=await request.json()
    if(typeof body.requestId!=='string' || typeof body.state!=='string' || typeof body.payerId!=='string' || !/^[A-Za-z0-9]{1,64}$/.test(body.payerId))throw new Error('The PayPal approval details are incomplete.')
    requestId=body.requestId
    const login=process.env.AUTHORIZENET_API_LOGIN_ID,key=process.env.AUTHORIZENET_TRANSACTION_KEY
    if(!login || !key)throw new Error('PayPal payment service has not been configured.')
    const claim=await ctx.runMutation(internal.payments.claimPaypal,{requestId,state:body.state})
    if(claim.paid)return json({ok:true,transactionId:claim.transactionId,message:'Your PayPal payment has already been received.'})
    submitted=true
    const response=await fetch(process.env.AUTHORIZENET_ENV==='sandbox' ? 'https://apitest.authorize.net/xml/v1/request.api':'https://api.authorize.net/xml/v1/request.api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({createTransactionRequest:{merchantAuthentication:{name:login,transactionKey:key},transactionRequest:{transactionType:'authCaptureContinueTransaction',amount:claim.amount!.toFixed(2),currencyCode:'USD',payment:{payPal:{payerID:body.payerId}},refTransId:claim.reference}}})})
    const data=JSON.parse((await response.text()).replace(/^\uFEFF/,''))
    const tx=data.transactionResponse
    if(data.messages?.resultCode==='Ok' && tx?.responseCode==='1' && tx.transId && tx.transId!=='0'){
      try{await ctx.runMutation(internal.payments.finishPayment,{requestId,status:'paid',transactionId:tx.transId})}catch{console.error('[Calary] PayPal record needs reconciliation',requestId,tx.transId)}
      return json({ok:true,transactionId:tx.transId,message:claim.kind==='booking' ? 'Your $50 deposit is paid and your appointment is booked for your selected time.' : 'Your PayPal payment is complete. Your order details have been received.'})
    }
    await ctx.runMutation(internal.payments.finishPayment,{requestId,status:tx?.responseCode==='2' ? 'declined':'unknown'})
    return json({ok:false,message:'PayPal payment was not confirmed. Contact the studio with your checkout reference before trying again.',retryable:false},400)
  }catch(error){
    if(submitted){try{await ctx.runMutation(internal.payments.finishPayment,{requestId,status:'unknown'})}catch{}}
    return json({ok:false,message:submitted ? `PayPal payment could not be verified. Contact the studio with reference ${requestId} before trying again.` : error instanceof Error ? error.message : 'Unable to verify PayPal approval.',retryable:false},400)
  }
})
