import type { ResolvedLine } from '@/store/cart'
import { convexSiteUrl } from '@/lib/convex'
import type { BookingDetails, CustomerDetails, PaymentNonce } from '../../shared/checkout'

export interface CheckoutResult { ok: boolean; message: string; transactionId?: string; retryable?: boolean }
export async function startCheckout(lines: ResolvedLine[], customer: CustomerDetails, payment: PaymentNonce, requestId: string, booking?: BookingDetails): Promise<CheckoutResult> {
  const siteUrl = convexSiteUrl()
  if (!siteUrl) return {ok:false, message:'Payment service is not configured. Please contact Calary Beauty.', retryable:true}
  try {
    const response = await fetch(`${siteUrl}/authorize-net-payment`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({requestId, customer, payment, ...(booking ? {booking} : {items:lines.map(line=>({productId:line.product.id,length:line.length,quantity:line.quantity}))})}) })
    const result = await response.json() as CheckoutResult
    return {ok:response.ok && result.ok === true, message:result.message || 'Unable to verify payment. Contact the studio before trying again.', transactionId:result.transactionId, retryable:result.retryable === true}
  } catch {
    return {ok:false, message:'We could not verify the payment result. Contact the studio before trying again to avoid paying twice.', retryable:false}
  }
}
