/// <reference types="vite/client" />
import {afterEach,beforeEach,expect,test,vi} from 'vitest'
import {convexTest} from 'convex-test'
import {createHmac} from 'node:crypto'
import schema from './schema'
import {api,internal} from './_generated/api'
import {verifyStripeSignature,stripeCheckoutUrl} from '../shared/stripe'
import {newNaturalServices} from '../shared/services'
const modules=import.meta.glob('./**/*.ts')
const origin='https://www.calarybeauty.com',secret='whsec_test_fixture'
const address={firstName:'Jane',lastName:'Doe',company:'',address:'10 Main St',address2:'',city:'Baltimore',state:'MD',zip:'21201',country:'US'}
const customer={email:'jane@example.com',phone:'5551234567',billing:address,shipping:address}
const ref='a1234567-1234-1234-1234-123456789012',token='b1234567-1234-1234-1234-123456789012'
const item={productId:'test-wig',quantity:2,length:'18"'}
const booking={serviceId:'medium-knotless',length:'Waist length',extras:[],date:'2099-01-05',time:'10:00',notes:'Sensitive scalp',policyAccepted:true}
type Session=Record<string,any>
let sessions:Map<string,Session>,keys:Map<string,string>,gateway:ReturnType<typeof vi.fn>
beforeEach(()=>{
 vi.stubEnv('STRIPE_MODE','test');vi.stubEnv('STRIPE_ENABLED','true');vi.stubEnv('STRIPE_AFFIRM_ENABLED','true');vi.stubEnv('STRIPE_SECRET_KEY','sk_test_fixture');vi.stubEnv('STRIPE_WEBHOOK_SECRET',secret);vi.stubEnv('SITE_URL',origin)
 sessions=new Map();keys=new Map()
 gateway=vi.fn(async(url:string,options:RequestInit={})=>{
  const path=new URL(url).pathname
  if(options.method==='POST' && path==='/v1/checkout/sessions'){
   const params=new URLSearchParams(String(options.body)),idem=(options.headers as Record<string,string>)['Idempotency-Key']
   const existing=keys.get(idem);if(existing)return Response.json(sessions.get(existing))
   let amount=Number(params.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]')||0)
   for(let i=0;params.has(`line_items[${i}][quantity]`);i++)amount+=Number(params.get(`line_items[${i}][quantity]`))*Number(params.get(`line_items[${i}][price_data][unit_amount]`))
   const id=`cs_test_session${sessions.size+1}`
   const s:Session={id,object:'checkout.session',mode:'payment',currency:'usd',amount_total:amount,client_reference_id:params.get('client_reference_id'),metadata:{integration:'calary-affirm-v1',requestId:params.get('metadata[requestId]')},livemode:false,payment_method_types:[params.get('payment_method_types[0]')],status:'open',payment_status:'unpaid',payment_intent:null,url:`https://checkout.stripe.com/c/pay/${id}`,customer_details:{name:'Jane Updated',email:'updated@example.com',phone:'+14435555555',address:{line1:'20 Billing',city:'Baltimore',state:'MD',postal_code:'21201',country:'US'}},...(params.has('shipping_options[0][shipping_rate_data][fixed_amount][amount]') ? {shipping_details:{name:'Jane Receiver',address:{line1:'30 Delivery',line2:'Unit 2',city:'Baltimore',state:'MD',postal_code:'21244',country:'US'}}}:{})}
   sessions.set(id,s);keys.set(idem,id);return Response.json(s)
  }
  if(path.startsWith('/v1/payment_intents/'))return Response.json({metadata:{integration:'calary-affirm-v1',requestId:ref}})
  const id=path.split('/')[4],s=sessions.get(id)
  if(!s)return Response.json({error:'missing'},{status:404})
  if(path.endsWith('/expire')){if(s.status==='open')s.status='expired';else return Response.json({error:'already complete'},{status:400})}
  return Response.json(s)
 })
 vi.stubGlobal('fetch',gateway)
})
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.restoreAllMocks()})
async function setup(){const t=convexTest(schema,modules);await t.run(ctx=>ctx.db.insert('products',{slug:'test-wig',name:'Test wig',tag:'',subtitle:'',price:200,image:'/test.jpg',category:'wigs',origin:'',detail:'',specs:[],lengths:['18"'],active:true,order:0,updatedAt:0}));return t}
function post(t:ReturnType<typeof convexTest>,path:string,value:unknown,requestOrigin=origin){return t.fetch(path,{method:'POST',headers:{Origin:requestOrigin,'Content-Type':'application/json'},body:JSON.stringify(value)})}
const order=(method='affirm')=>({requestId:ref,token,method,customer,items:[item],amount:1,shippingAmount:999})
const paid=()=>{const s=[...sessions.values()][0];s.status='complete';s.payment_status='paid';s.payment_intent='pi_fixture';return s}
async function webhook(t:ReturnType<typeof convexTest>,type='checkout.session.completed',object:unknown=[...sessions.values()][0],timestamp=Math.floor(Date.now()/1000)){
 const raw=JSON.stringify({id:'evt_fixture',type,data:{object}}),signature=createHmac('sha256',secret).update(`${timestamp}.${raw}`).digest('hex')
 return t.fetch('/stripe-webhook',{method:'POST',headers:{'Stripe-Signature':`t=${timestamp},v1=${signature}`},body:raw})
}
const records=(t:ReturnType<typeof convexTest>)=>t.run(ctx=>ctx.db.query('paymentRecords').collect())
test('server prices product checkout, adds $10 shipping once, reserves unpaid order and persists original addresses',async()=>{
 const t=await setup(),res=await post(t,'/stripe-checkout',order());expect(res.status).toBe(200);expect((await res.json()).url).toMatch(/^https:\/\/checkout.stripe.com/)
 const params=new URLSearchParams(String(gateway.mock.calls[0][1].body));expect(params.get('line_items[0][price_data][unit_amount]')).toBe('20000');expect(params.get('line_items[0][quantity]')).toBe('2');expect(params.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]')).toBe('1000');expect(params.get('payment_method_types[0]')).toBe('affirm');expect(params.get('billing_address_collection')).toBe('required');expect(params.get('shipping_address_collection[allowed_countries][0]')).toBe('US');expect(params.get('success_url')).toContain('#token=');expect(params.get('success_url')).not.toContain('jane')
 const [record]=await records(t);expect(record.amount).toBe(410);expect(record.status).toBe('processing');expect(JSON.parse(record.payload).customer.shipping.address).toBe('10 Main St')
})
test('product card uses Stripe; $20 and $50 appointments use card and have no shipping',async()=>{
 const t=await setup();await post(t,'/stripe-checkout',order('card'));expect([...sessions.values()][0].payment_method_types).toEqual(['card'])
 const natural=newNaturalServices[0]
 for(const [i,b] of [booking,{...booking,serviceId:natural.id,length:natural.lengths[0].name}].entries()){
  const res=await post(t,'/stripe-checkout',{requestId:`a1234567-1234-1234-1234-12345678901${i+3}`,token,method:'card',customer:{...customer,shipping:undefined},booking:b,amount:1});expect(res.status).toBe(200)
  const p=new URLSearchParams(String(gateway.mock.calls.at(-1)![1].body));expect(p.get('line_items[0][price_data][unit_amount]')).toBe(i===0 ? '5000':'2000');expect(p.has('shipping_options[0][shipping_rate_data][fixed_amount][amount]')).toBe(false);expect(p.has('shipping_address_collection[allowed_countries][0]')).toBe(false)
 }
 expect((await records(t)).filter(r=>r.kind==='booking').map(r=>r.amount)).toEqual([50,20])
})
test('stock, quantities, lengths, empty bag, appointment policy/hours and Affirm booking restriction reject before provider',async()=>{
 const t=await setup()
 for(const patch of [{items:[]},{items:[{...item,quantity:0}]},{items:[{...item,length:'invalid'}]},{items:[{...item,productId:'missing'}]},{items:[item,item]}])expect((await post(t,'/stripe-checkout',{...order(),...patch})).status).toBe(400)
 for(const b of [{...booking,time:'09:29'},{...booking,date:'2099-01-11'},{...booking,time:'19:01'},{...booking,policyAccepted:false}])expect((await post(t,'/stripe-checkout',{requestId:ref,token,method:'card',customer,booking:b})).status).toBe(400)
 expect((await post(t,'/stripe-checkout',{requestId:ref,token,method:'affirm',customer,booking})).status).toBe(400)
 await t.run(async ctx=>{const p=(await ctx.db.query('products').collect())[0];await ctx.db.patch(p._id,{inStock:false})})
 expect((await post(t,'/stripe-checkout',order())).status).toBe(400);expect(gateway).not.toHaveBeenCalled()
})
test('Affirm US/amount/configuration checks and origin checks prevent provider requests',async()=>{
 const t=await setup();expect((await post(t,'/stripe-checkout',{...order(),customer:{...customer,billing:{...address,country:'CA'}}})).status).toBe(400)
 await t.run(async ctx=>{const p=(await ctx.db.query('products').collect())[0];await ctx.db.patch(p._id,{price:10})})
 expect((await post(t,'/stripe-checkout',{...order(),items:[{...item,quantity:1}]})).status).toBe(400)
 vi.stubEnv('STRIPE_AFFIRM_ENABLED','false');expect((await post(t,'/stripe-checkout',order())).status).toBe(400)
 expect((await post(t,'/stripe-checkout',order(),'https://evil.example')).status).toBe(403)
 vi.stubEnv('STRIPE_MODE','live');expect((await post(t,'/stripe-checkout',order())).status).toBe(400);expect(gateway).not.toHaveBeenCalled()
})
test('same reference reuses provider session and immutable prices; changed cart/token cannot reuse reference',async()=>{
 const t=await setup();await post(t,'/stripe-checkout',order())
 await t.run(async ctx=>{const p=(await ctx.db.query('products').collect())[0];await ctx.db.patch(p._id,{price:220})})
 expect((await post(t,'/stripe-checkout',order())).status).toBe(200);expect(sessions.size).toBe(1);expect((await records(t))).toHaveLength(1)
 expect((await post(t,'/stripe-checkout',{...order(),items:[{...item,quantity:3}]})).status).toBe(400)
 expect((await post(t,'/stripe-checkout',{...order(),token:'c1234567-1234-1234-1234-123456789012'})).status).toBe(400)
 expect(sessions.size).toBe(1)
})
test('unknown creation response recovers through the exact persisted Stripe idempotency key',async()=>{
 const t=await setup(),normal=gateway.getMockImplementation()!
 gateway.mockImplementationOnce(async(...args:any[])=>{await normal(...args);throw new Error('Lost response')})
 const result=await (await post(t,'/stripe-checkout',order())).json();expect(result.retryable).toBe(false);expect(sessions.size).toBe(1);expect((await records(t))[0].stripeSessionId).toBeUndefined()
 const recovered=await (await post(t,'/stripe-checkout-status',{requestId:ref,token})).json();expect(recovered.status).toBe('open');expect(sessions.size).toBe(1)
 const posts=gateway.mock.calls.filter(c=>c[1].method==='POST');expect(posts[0][1].headers['Idempotency-Key']).toBe(posts[1][1].headers['Idempotency-Key']);expect(posts[0][1].body).toBe(posts[1][1].body)
})
test('webhook requires raw-body signature and fresh timestamp before any API call',async()=>{
 const t=await setup();await post(t,'/stripe-checkout',order());gateway.mockClear()
 expect((await t.fetch('/stripe-webhook',{method:'POST',headers:{'Stripe-Signature':'t=0,v1=bad'},body:'{}'})).status).toBe(400)
 expect((await webhook(t,'checkout.session.completed',undefined,Math.floor(Date.now()/1000)-301)).status).toBe(400);expect(gateway).not.toHaveBeenCalled()
 const raw='{"example":true}',ts=Math.floor(Date.now()/1000),signature=createHmac('sha256',secret).update(`${ts}.${raw}`).digest('hex')
 expect(await verifyStripeSignature(raw,`t=${ts},v1=${'0'.repeat(64)},v1=${signature}`,secret)).toBe(true);expect(await verifyStripeSignature(raw+' ',`t=${ts},v1=${signature}`,secret)).toBe(false)
})
test('signed paid event finalizes once with authoritative delivery details; stale events cannot undo payment',async()=>{
 const t=await setup();await post(t,'/stripe-checkout',order());const s=paid()
 expect((await webhook(t)).status).toBe(200);expect((await webhook(t)).status).toBe(200)
 expect((await webhook(t,'checkout.session.expired',{...s,status:'expired',payment_status:'unpaid'})).status).toBe(200)
 const rows=await records(t);expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({status:'paid',transactionId:'pi_fixture'});expect(JSON.parse(rows[0].payload).stripeShippingDetails.address.line1).toBe('30 Delivery')
})
test('wrong total, currency, mode and unrelated session cannot finalize a payment',async()=>{
 const t=await setup();await post(t,'/stripe-checkout',order());const s=paid()
 for(const patch of [{amount_total:1},{currency:'eur'},{livemode:true},{client_reference_id:'wrong'}]){
  const original={...s};Object.assign(s,patch);expect((await webhook(t)).status).toBe(500);Object.assign(s,original)
 }
 expect((await records(t))[0].status).toBe('processing')
})
test('return reconciliation is server verified, exposes no customer data, requires private token and cannot trust URL success',async()=>{
 const t=await setup();await post(t,'/stripe-checkout',order());gateway.mockClear()
 expect((await post(t,'/stripe-checkout-status',{requestId:ref,token:'c1234567-1234-1234-1234-123456789012',status:'paid'})).status).toBe(404);expect(gateway).not.toHaveBeenCalled()
 let result=await (await post(t,'/stripe-checkout-status',{requestId:ref,token,status:'paid'})).json();expect(result.status).toBe('open');expect(JSON.stringify(result)).not.toContain('Jane')
 paid();result=await (await post(t,'/stripe-checkout-status',{requestId:ref,token})).json();expect(result.status).toBe('paid');expect(result.kind).toBe('order');expect((await records(t))[0].status).toBe('paid')
})
test('cancel expires open session; a payment winning the cancellation race is recorded as paid',async()=>{
 const t=await setup();await post(t,'/stripe-checkout',order());expect((await (await post(t,'/stripe-checkout-status',{requestId:ref,token,cancel:true})).json()).status).toBe('expired');expect((await records(t))[0].status).toBe('declined')
 const other=await setup();sessions.clear();keys.clear();await post(other,'/stripe-checkout',order());paid();expect((await (await post(other,'/stripe-checkout-status',{requestId:ref,token,cancel:true})).json()).status).toBe('paid')
})
test('paid appointment uses saved time/deposit, appears in admin, never creates shipping, and supports later notes',async()=>{
 const t=await setup();await post(t,'/stripe-checkout',{requestId:ref,token,method:'card',customer,booking});paid();expect((await webhook(t)).status).toBe(200)
 const result=await (await post(t,'/stripe-checkout-status',{requestId:ref,token})).json();expect(result.kind).toBe('booking');expect(result.message).toContain('10:00');expect(result.amount).toBe(50)
 const id=await t.run(ctx=>ctx.db.insert('users',{email:'admin@example.com'}));vi.stubEnv('ADMIN_EMAILS','admin@example.com');const admin=t.withIdentity({subject:`${id}|session`})
 const list=await admin.query(api.appointments.list,{paginationOpts:{numItems:25,cursor:null}});expect(list.page).toHaveLength(1);expect(list.page[0]).toMatchObject({time:'10:00',deposit:50})
})
test('admin order listing requires authentication and never exposes checkout token or Stripe request parameters',async()=>{
 const t=await setup();await post(t,'/stripe-checkout',order());await expect(t.query(api.orders.list,{paginationOpts:{numItems:25,cursor:null}})).rejects.toThrow('sign-in')
 const id=await t.run(ctx=>ctx.db.insert('users',{email:'admin@example.com'}));vi.stubEnv('ADMIN_EMAILS','admin@example.com');const admin=t.withIdentity({subject:`${id}|session`});const result=await admin.query(api.orders.list,{paginationOpts:{numItems:25,cursor:null}});expect(result.page).toHaveLength(1);expect(JSON.stringify(result)).not.toContain(token);expect(JSON.stringify(result)).not.toContain('stripeParams')
})
test('signed Stripe refund updates original payment without rolling it back or allowing stale refund totals',async()=>{
 const t=await setup();await post(t,'/stripe-checkout',order());paid();await webhook(t)
 const charge={id:'ch_fixture',object:'charge',metadata:{},payment_intent:'pi_fixture',amount:41000,amount_refunded:10000,currency:'usd',livemode:false}
 expect((await webhook(t,'charge.refunded',charge)).status).toBe(200);expect((await webhook(t,'charge.refunded',{...charge,amount_refunded:5000})).status).toBe(200)
 expect((await records(t))[0]).toMatchObject({status:'paid',stripeRefundedAmount:10000})
})
test('session redirects cannot leave Stripe and legacy payment endpoints no longer exist',async()=>{
 for(const url of ['http://checkout.stripe.com/pay','https://checkout.stripe.com.evil.example/pay','https://evil.example','javascript:alert(1)'])expect(()=>stripeCheckoutUrl(url)).toThrow()
 const t=await setup();expect((await post(t,'/authorize-net-payment',{})).status).toBe(404);expect((await post(t,'/authorize-net-paypal-complete',{})).status).toBe(404)
})
