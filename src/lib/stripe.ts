import {convexSiteUrl} from './convex'
import type {ResolvedLine, CartLine} from '../store/cart'
import type {BookingDetails,CustomerDetails} from '../../shared/checkout'
import {stripeCheckoutUrl} from '../../shared/stripe'
export const affirmEnabled=import.meta.env.VITE_STRIPE_AFFIRM_ENABLED==='true'
const key='calary.pendingStripe.v1'
export interface PendingStripe {requestId:string;token:string;items:CartLine[]}
export interface StripeStatus {ok:boolean;status?:'paid'|'expired'|'open'|'pending';url?:string;transactionId?:string;kind?:'order'|'booking';amount?:number;message?:string}
export function readPendingStripe():PendingStripe|null{try{const p=JSON.parse(sessionStorage.getItem(key)||'null');return p && typeof p.requestId==='string' && typeof p.token==='string' && Array.isArray(p.items) ? p:null}catch{return null}}
export function pendingStripeUrl(p:Pick<PendingStripe,'requestId'|'token'>){return `/stripe-return?reference=${encodeURIComponent(p.requestId)}#token=${encodeURIComponent(p.token)}`}
export function clearPendingStripe(requestId:string){
 try{if(readPendingStripe()?.requestId===requestId)sessionStorage.removeItem(key);if(sessionStorage.getItem('calary.pendingPayment')===requestId)sessionStorage.removeItem('calary.pendingPayment')}catch{/* payment remains verifiable on the return URL */}
}
async function request(path:string,body:unknown){
 const site=convexSiteUrl();if(!site)throw new Error('The payment service is not configured. Contact the studio.')
 const response=await fetch(`${site}${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)})
 const result=await response.json()
 return {...result,ok:response.ok && result.ok===true}
}
export async function startStripeCheckout(lines:ResolvedLine[],customer:CustomerDetails,requestId:string,method:'card'|'affirm',booking?:BookingDetails){
 if(readPendingStripe())throw new Error('Review your pending Stripe checkout before starting another payment.')
 if(method==='affirm' && (customer.billing.country!=='US' || customer.shipping?.country!=='US'))throw new Error('Affirm requires US billing and delivery addresses. Choose another payment method.')
 const pending:PendingStripe={requestId,token:crypto.randomUUID(),items:lines.map(line=>({productId:line.product.id,...(line.length ? {length:line.length}:{}),quantity:line.quantity}))}
 // Persist before sending, so a lost response cannot silently start a second payment.
 try{sessionStorage.setItem(key,JSON.stringify(pending));sessionStorage.setItem('calary.pendingPayment',requestId)}catch{clearPendingStripe(requestId);throw new Error('Enable browser session storage before using Stripe checkout.')}
 try{
  const result=await request('/stripe-checkout',{requestId:pending.requestId,token:pending.token,customer,method,...(booking ? {booking}:{items:pending.items})})
  if(!result.ok){if(result.retryable===true)clearPendingStripe(requestId);return {ok:false,message:result.message || 'Stripe checkout could not be opened.',retryable:result.retryable===true}}
  window.location.assign(result.paid ? pendingStripeUrl(pending):stripeCheckoutUrl(result.url))
  return {ok:true,redirecting:true,retryable:false,message:'Opening secure Stripe checkout…'}
 }catch{
  return {ok:false,retryable:false,message:'We could not confirm the checkout result. Review the pending Stripe checkout before paying again.'}
 }
}
export async function stripeStatus(p:Pick<PendingStripe,'requestId'|'token'>,cancel=false):Promise<StripeStatus>{return request('/stripe-checkout-status',{requestId:p.requestId,token:p.token,...(cancel ? {cancel:true}:{})})}
