import {afterEach,expect,test,vi} from 'vitest'
const mocks=vi.hoisted(()=>({fetch:vi.fn()}))
vi.mock('../src/lib/convex',()=>({convexSiteUrl:()=> 'https://example.convex.site'}))
import {startStripeCheckout,readPendingStripe,clearPendingStripe} from '../src/lib/stripe'
import type {ResolvedLine} from '../src/store/cart'
const address={firstName:'Jane',lastName:'Doe',company:'',address:'10 Main',address2:'',city:'Baltimore',state:'MD',zip:'21201',country:'US'}
const customer={email:'jane@example.com',phone:'5551234567',billing:address,shipping:address}
function setup(){const map=new Map<string,string>(),assign=vi.fn();vi.stubGlobal('sessionStorage',{getItem:(k:string)=>map.get(k)||null,setItem:(k:string,v:string)=>map.set(k,v),removeItem:(k:string)=>map.delete(k)});vi.stubGlobal('fetch',mocks.fetch);vi.stubGlobal('window',{location:{assign}});return {map,assign}}
afterEach(()=>{vi.unstubAllGlobals();mocks.fetch.mockReset()})
const lines=[{product:{id:'wig'},quantity:1,length:'18"'}] as ResolvedLine[]
test('client locks checkout before sending; failed network keeps reference for recovery',async()=>{const {map,assign}=setup();mocks.fetch.mockRejectedValue(new Error('offline'));const result=await startStripeCheckout(lines,customer,'fixture-reference','card');expect(result.retryable).toBe(false);expect(readPendingStripe()?.requestId).toBe('fixture-reference');expect(map.get('calary.pendingPayment')).toBe('fixture-reference');expect(assign).not.toHaveBeenCalled();await expect(startStripeCheckout(lines,customer,'other-reference','card')).rejects.toThrow('pending Stripe')})
test('client redirects only to Stripe and safe server rejection releases pending lock',async()=>{const {map,assign}=setup();mocks.fetch.mockResolvedValueOnce(Response.json({ok:false,retryable:true,message:'Choose a valid length.'},{status:400}));expect((await startStripeCheckout(lines,customer,'fixture-reference','card')).retryable).toBe(true);expect(map.size).toBe(0);mocks.fetch.mockResolvedValueOnce(Response.json({ok:true,url:'https://checkout.stripe.com/c/pay/session'}));await startStripeCheckout(lines,customer,'second-reference','affirm');expect(assign).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/session');clearPendingStripe('wrong-reference');expect(readPendingStripe()).not.toBeNull();clearPendingStripe('second-reference');expect(readPendingStripe()).toBeNull()})
