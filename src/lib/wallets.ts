import { convexSiteUrl } from './convex'
import { startCheckout, type CheckoutResult } from './checkout'
import type { ResolvedLine } from '@/store/cart'
import type { BookingDetails, CustomerDetails } from '../../shared/checkout'
export type PaymentMethod='card'|'apple'|'paypal'
interface AppleSession {
 onvalidatemerchant:((event:{validationURL:string})=>void)|null
 onpaymentauthorized:((event:{payment:{token:{paymentData:unknown}}})=>void)|null
 oncancel:(()=>void)|null
 completeMerchantValidation:(session:unknown)=>void
 completePayment:(status:number)=>void
 abort:()=>void;begin:()=>void
}
declare global {interface Window {ApplePaySession?:{new(version:number,request:unknown):AppleSession;canMakePayments:()=>boolean;STATUS_SUCCESS:number;STATUS_FAILURE:number}}}
export function appleAvailable(){try{return import.meta.env.VITE_APPLE_PAY_ENABLED==='true' && Boolean(window.ApplePaySession?.canMakePayments()) && window.isSecureContext}catch{return false}}
export const paypalAvailable=import.meta.env.VITE_PAYPAL_ENABLED==='true'
export async function walletJson(path:string,body:unknown){
 const site=convexSiteUrl();if(!site)throw new Error('Payment service has not been configured.')
 const response=await fetch(`${site}${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
 const result=await response.json();if(!response.ok)throw new Error(result.message || 'The payment service could not complete this request.');return result
}
export function payApple(lines:ResolvedLine[],customer:CustomerDetails,requestId:string,amount:number,booking:BookingDetails|undefined,beforeCharge:()=>void):Promise<CheckoutResult>{
 const Apple=window.ApplePaySession
 if(!Apple)return Promise.resolve({ok:false,retryable:true,message:'Apple Pay is unavailable on this device.'})
 return new Promise(resolve=>{
  let submitted=false
  const session=new Apple(3,{countryCode:import.meta.env.VITE_APPLE_PAY_COUNTRY || 'US',currencyCode:'USD',supportedNetworks:['visa','masterCard','amex','discover'],merchantCapabilities:['supports3DS'],total:{label:booking ? 'Calary Beauty appointment deposit':'Calary Beauty',amount:amount.toFixed(2),type:'final'}})
  session.onvalidatemerchant=async event=>{try{const merchant=await walletJson('/authorize-net-apple-pay-session',{validationURL:event.validationURL});session.completeMerchantValidation(merchant)}catch(error){session.abort();resolve({ok:false,retryable:true,message:error instanceof Error ? error.message:'Apple Pay merchant validation failed.'})}}
  session.onpaymentauthorized=async event=>{
   if(submitted)return;submitted=true
   const bytes=new TextEncoder().encode(JSON.stringify(event.payment.token.paymentData));const dataValue=btoa(Array.from(bytes,byte=>String.fromCharCode(byte)).join(''))
   beforeCharge()
   const result=await startCheckout(lines,customer,{dataDescriptor:'COMMON.APPLE.INAPP.PAYMENT',dataValue},requestId,booking)
   try{session.completePayment(result.ok ? Apple.STATUS_SUCCESS:Apple.STATUS_FAILURE)}finally{resolve(result)}
  }
  session.oncancel=()=>{if(!submitted)resolve({ok:false,retryable:true,message:'Apple Pay was cancelled. Your payment has not been submitted.'})}
  session.begin()
 })
}
export function payPaypal(popup:Window|null,lines:ResolvedLine[],customer:CustomerDetails,requestId:string,booking:BookingDetails|undefined,beforeCharge:()=>void):Promise<CheckoutResult>{
 if(!popup)return Promise.resolve({ok:false,retryable:true,message:'Allow the PayPal popup, then try again.'})
 return new Promise(resolve=>{
  let finished=false,approvalStarted=false
  const done=(result:CheckoutResult)=>{if(finished)return;finished=true;clearInterval(timer);window.removeEventListener('message',receive);popup.close();resolve(result)}
  const receive=async(event:MessageEvent)=>{
   if(event.origin!==window.location.origin || event.source!==popup || event.data?.type!=='calary-paypal-return' || event.data.reference!==requestId || approvalStarted)return
   if(event.data.result==='cancelled'){done({ok:false,retryable:false,message:'PayPal was cancelled. No payment was confirmed. Contact the studio before starting a new checkout.'});return}
   approvalStarted=true
   try{done(await walletJson('/authorize-net-paypal-complete',{requestId,state:event.data.state,payerId:event.data.payerId}))}catch(error){done({ok:false,retryable:false,message:error instanceof Error ? error.message:'PayPal payment could not be confirmed. Contact the studio before paying again.'})}
  }
  window.addEventListener('message',receive)
  const timer=setInterval(()=>{if(popup.closed && !approvalStarted)done({ok:false,retryable:false,message:'PayPal was closed before payment was confirmed. Contact the studio before starting a new checkout.'})},1000)
  beforeCharge()
  walletJson('/authorize-net-payment',{requestId,customer,method:'paypal',...(booking ? {booking}:{items:lines.map(line=>({productId:line.product.id,length:line.length,quantity:line.quantity}))})}).then(result=>{
   if(finished)return
   if(!result.pending || !result.redirectUrl){done(result);return}
   const url=new URL(result.redirectUrl)
   if(url.protocol!=='https:' || !(url.hostname==='paypal.com' || url.hostname.endsWith('.paypal.com')))throw new Error('PayPal returned an invalid checkout address.')
   popup.location.href=url.href
  }).catch(error=>done({ok:false,retryable:false,message:error instanceof Error ? error.message:'PayPal checkout could not be verified. Contact the studio before paying again.'}))
 })
}
