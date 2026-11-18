/** Stripe Checkout is restricted to US product orders, in cents. */
export const STRIPE_API_VERSION = '2025-02-24.acacia'
export const AFFIRM_MIN_CENTS = 3500
export const AFFIRM_MAX_CENTS = 3000000
export function stripeCheckoutUrl(value: unknown): string {
  if(typeof value!=='string')throw new Error('Stripe checkout could not be opened.')
  const url=new URL(value)
  if(url.protocol!=='https:' || url.hostname!=='checkout.stripe.com' || url.username || url.password)throw new Error('Stripe checkout returned an invalid address.')
  return url.href
}
export function plainObject(value: unknown): Record<string, unknown> {
  if(!value || typeof value!=='object' || Array.isArray(value))throw new Error('Check your checkout details.')
  return value as Record<string,unknown>
}
export function cents(value:number):number {
  const result=Math.round(value*100)
  if(!Number.isFinite(value) || !Number.isSafeInteger(result) || value<=0 || Math.abs(result/100-value)>0.000001)throw new Error('A product has an invalid price. Contact the studio.')
  return result
}
/** Verify the unmodified body with Web Crypto HMAC, including rotation signatures. */
export async function verifyStripeSignature(raw:string,header:string|null,secret:string,now=Date.now()):Promise<boolean>{
  if(!header || header.length>4096 || !secret)return false
  const fields=header.split(',').map(part=>part.trim().split('='))
  const timestamps=fields.filter(([key])=>key==='t')
  if(timestamps.length!==1 || !/^\d+$/.test(timestamps[0][1] || ''))return false
  const timestamp=Number(timestamps[0][1])
  if(!Number.isSafeInteger(timestamp) || Math.abs(now/1000-timestamp)>300)return false
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify'])
  const message=new TextEncoder().encode(`${timestamp}.${raw}`)
  for(const [scheme,signature] of fields){
    if(scheme!=='v1' || !/^[a-f0-9]{64}$/i.test(signature || ''))continue
    const bytes=Uint8Array.from(signature.match(/.{2}/g)!,pair=>parseInt(pair,16))
    if(await crypto.subtle.verify('HMAC',key,bytes,message))return true
  }
  return false
}
