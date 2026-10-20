/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { convexTest } from 'convex-test'
import schema from './schema'
import { validateBooking } from '../shared/booking'
import { parseCustomer, gatewayAddress } from '../shared/checkout'
import { services } from '../shared/services'
const modules=import.meta.glob('./**/*.ts')
const address={firstName:'Jane',lastName:'Doe',company:'',address:'10 Main St',address2:'Suite 2',city:'Baltimore',state:'MD',zip:'21201',country:'US'}
const customer={email:'jane@example.com',phone:'5550100200',billing:address,shipping:{...address,address:'20 Other St',address2:'',city:'New York',state:'NY',zip:'10001'}}
const booking={serviceId:'medium-knotless',length:'Waist length',extras:['Beads'],date:'2099-10-20',time:'14:30',notes:'',policyAccepted:true}
const payment={dataDescriptor:'COMMON.ACCEPT.INAPP.PAYMENT',dataValue:'mock-token'}
const id='a1234567-1234-1234-1234-123456789012'
let gateway:ReturnType<typeof vi.fn>
beforeEach(()=>{
  vi.stubEnv('AUTHORIZENET_API_LOGIN_ID','test-login');vi.stubEnv('AUTHORIZENET_TRANSACTION_KEY','test-key');vi.stubEnv('AUTHORIZENET_ENV','sandbox')
  gateway=vi.fn().mockResolvedValue(new Response(JSON.stringify({messages:{resultCode:'Ok'},transactionResponse:{responseCode:'1',transId:'mock-transaction'}})))
  vi.stubGlobal('fetch',gateway)
})
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()})
async function post(t:ReturnType<typeof convexTest>,body:unknown){return t.fetch('/authorize-net-payment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})}
describe('checkout',()=>{
 test('records chosen time, charges exactly $50, sends customer and addresses, and deduplicates retry',async()=>{
  const t=convexTest(schema,modules)
  const response=await post(t,{requestId:id,customer,payment,booking,amount:1})
  expect(response.status).toBe(200)
  const result=await response.json();expect(result.ok).toBe(true);expect(result.message).toContain('14:30')
  const sent=JSON.parse(gateway.mock.calls[0][1].body).createTransactionRequest.transactionRequest
  expect(sent.amount).toBe('50.00');expect(sent.customer.email).toBe(customer.email)
  expect(sent.billTo.address).toBe('10 Main St, Suite 2');expect(sent.billTo.phoneNumber).toBe(customer.phone)
  expect(sent.shipTo).toBeUndefined();expect(sent.shipping).toBeUndefined()
  const records=await t.run(ctx=>ctx.db.query('paymentRecords').take(10))
  expect(records[0].status).toBe('paid');expect(JSON.parse(records[0].payload).booking.time).toBe('14:30')
  const retry=await post(t,{requestId:id,customer,payment,booking});expect((await retry.json()).ok).toBe(true);expect(gateway).toHaveBeenCalledTimes(1)
 })
 test('removes cornrows and every knotless thigh option while keeping regular-braid thigh options',()=>{
  expect(services.some(s=>s.id==='cornrows')).toBe(false)
  expect(services.filter(s=>s.category==='Knotless').every(s=>s.lengths.every(l=>l.name!=='Thigh length'))).toBe(true)
  expect(services.filter(s=>s.category==='Regular braids').every(s=>s.lengths.some(l=>l.name==='Thigh length'))).toBe(true)
  expect(()=>validateBooking({...booking,length:'Thigh length'})).toThrow()
 })
 test('rejects missing customer/address and overlong combined address before a gateway call',async()=>{
  const t=convexTest(schema,modules)
  expect((await post(t,{requestId:id,customer:{...customer,billing:{...address,firstName:''}},payment,booking})).status).toBe(400)
  expect(()=>parseCustomer({...customer,billing:{...address,address:'A'.repeat(60),address2:'Unit 1'}})).toThrow()
  expect(gateway).not.toHaveBeenCalled()
 })
 test('rejects past appointment, omitted deposit policy agreement, and invalid extras',()=>{
  expect(()=>validateBooking({...booking,date:'2020-01-01'})).toThrow()
  expect(()=>validateBooking({...booking,policyAccepted:false})).toThrow()
  expect(()=>validateBooking({...booking,extras:['Beads','Beads']})).toThrow()
  expect(()=>validateBooking({...booking,extras:['fake']})).toThrow()
 })
 test('order total comes from server catalogue, not client input; shipping address is retained',async()=>{
  const t=convexTest(schema,modules)
  await t.run(ctx=>ctx.db.insert('products',{slug:'test-wig',name:'Test Wig',tag:'',subtitle:'',price:200,image:'/test.jpg',category:'wigs',origin:'',detail:'',specs:[],lengths:['18"'],active:true,order:1,updatedAt:1}))
  const response=await post(t,{requestId:id,customer,payment,items:[{productId:'test-wig',quantity:2,length:'18"'}],amount:1,shippingAmount:999})
  expect(response.status).toBe(200)
  const sent=JSON.parse(gateway.mock.calls[0][1].body).createTransactionRequest.transactionRequest
  expect(sent.amount).toBe('410.00');expect(sent.shipping.amount).toBe('10.00');expect(sent.shipTo.zip).toBe('10001')
 })
 test('ambiguous gateway failure blocks same-reference retries',async()=>{
  const t=convexTest(schema,modules);gateway.mockRejectedValue(new Error('network failure'))
  const response=await post(t,{requestId:id,customer,payment,booking});expect((await response.json()).retryable).toBe(false)
  const retry=await post(t,{requestId:id,customer,payment,booking});expect(retry.status).toBe(409);expect(gateway).toHaveBeenCalledTimes(1)
 })
 test('appointment needs no shipping address; product order rejects a missing shipping address',async()=>{
  const t=convexTest(schema,modules)
  const {shipping: _shipping,...noShipping}=customer
  expect((await post(t,{requestId:id,customer:noShipping,payment,booking})).status).toBe(200)
  const other=convexTest(schema,modules)
  expect((await post(other,{requestId:id,customer:noShipping,payment,items:[{productId:'test',quantity:1}]})).status).toBe(400)
  expect(gateway).toHaveBeenCalledTimes(1)
 })
 test('gateway mapping preserves address parts and country code',()=>{
  expect(gatewayAddress(parseCustomer(customer).billing)).toMatchObject({address:'10 Main St, Suite 2',country:'US'})
 })
})

describe('wallet configuration and confirmation',()=>{
 test('wallets reject requests while disabled, without contacting the gateway',async()=>{
  const t=convexTest(schema,modules)
  expect((await post(t,{requestId:id,customer,booking,method:'paypal'})).status).toBe(503)
  expect((await post(t,{requestId:id,customer,booking,payment:{...payment,dataDescriptor:'COMMON.APPLE.INAPP.PAYMENT'}})).status).toBe(503)
  expect((await t.fetch('/authorize-net-apple-pay-session',{method:'POST',body:JSON.stringify({validationURL:'https://example.com'})})).status).toBe(503)
  expect(gateway).not.toHaveBeenCalled()
 })
 test('enabled Apple Pay uses the encrypted token with the fixed deposit and no shipping',async()=>{
  vi.stubEnv('AUTHORIZENET_APPLE_PAY_ENABLED','true')
  const t=convexTest(schema,modules)
  expect((await post(t,{requestId:id,customer,booking,payment:{...payment,dataDescriptor:'COMMON.APPLE.INAPP.PAYMENT'}})).status).toBe(200)
  const sent=JSON.parse(gateway.mock.calls[0][1].body).createTransactionRequest.transactionRequest
  expect(sent.payment.opaqueData.dataDescriptor).toBe('COMMON.APPLE.INAPP.PAYMENT');expect(sent.amount).toBe('50.00');expect(sent.shipTo).toBeUndefined()
 })
 test('PayPal initiation stays unpaid; confirmation captures stored amount only once',async()=>{
  vi.stubEnv('AUTHORIZENET_PAYPAL_ENABLED','true');vi.stubEnv('SITE_URL','https://calary.example')
  gateway.mockResolvedValueOnce(new Response(JSON.stringify({messages:{resultCode:'Ok'},transactionResponse:{responseCode:'1',transId:'paypal-init',secureAcceptance:{SecureAcceptanceUrl:'https://www.sandbox.paypal.com/checkout?token=test'}}})))
  const t=convexTest(schema,modules)
  const start=await post(t,{requestId:id,customer,booking,method:'paypal',amount:1});expect((await start.json()).pending).toBe(true)
  const record=(await t.run(ctx=>ctx.db.query('paymentRecords').take(1)))[0];expect(record.status).toBe('processing');expect(record.walletState).toBeTruthy()
  const initial=JSON.parse(gateway.mock.calls[0][1].body).createTransactionRequest.transactionRequest
  expect(initial.currencyCode).toBe('USD');expect(initial.payment.payPal.successUrl).toContain('/wallet-return');expect(initial.shipTo).toBeUndefined()
  const complete=()=>t.fetch('/authorize-net-paypal-complete',{method:'POST',body:JSON.stringify({requestId:id,state:record.walletState,payerId:'PAYER123',amount:1})})
  expect((await (await complete()).json()).ok).toBe(true)
  const sent=JSON.parse(gateway.mock.calls[1][1].body).createTransactionRequest.transactionRequest
  expect(sent).toMatchObject({transactionType:'authCaptureContinueTransaction',amount:'50.00',refTransId:'paypal-init',payment:{payPal:{payerID:'PAYER123'}}})
  expect((await (await complete()).json()).ok).toBe(true);expect(gateway).toHaveBeenCalledTimes(2)
 })
 test('PayPal rejects wrong return state before attempting capture',async()=>{
  vi.stubEnv('AUTHORIZENET_PAYPAL_ENABLED','true')
  const t=convexTest(schema,modules)
  await t.run(ctx=>ctx.db.insert('paymentRecords',{requestId:id,payload:'{}',kind:'booking',amount:50,status:'processing',walletState:'secret-state',paypalReference:'init',updatedAt:Date.now()}))
  const result=await t.fetch('/authorize-net-paypal-complete',{method:'POST',body:JSON.stringify({requestId:id,state:'wrong-state',payerId:'PAYER123'})})
  expect(result.status).toBe(400);expect(gateway).not.toHaveBeenCalled()
 })
 test('PayPal capture uncertainty blocks repeated capture',async()=>{
  vi.stubEnv('AUTHORIZENET_PAYPAL_ENABLED','true');gateway.mockRejectedValue(new Error('network failure'))
  const t=convexTest(schema,modules)
  await t.run(ctx=>ctx.db.insert('paymentRecords',{requestId:id,payload:'{}',kind:'booking',amount:50,status:'processing',walletState:'secret-state',paypalReference:'init',updatedAt:Date.now()}))
  const complete=()=>t.fetch('/authorize-net-paypal-complete',{method:'POST',body:JSON.stringify({requestId:id,state:'secret-state',payerId:'PAYER123'})})
  expect((await (await complete()).json()).retryable).toBe(false);await complete();expect(gateway).toHaveBeenCalledTimes(1)
 })
})
