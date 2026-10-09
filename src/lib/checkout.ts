import type { ResolvedLine } from '@/store/cart'
import { convexSiteUrl } from '@/lib/convex'

export interface CheckoutResult {
  ok: boolean
  message: string
  transactionId?: string
}

interface PaymentNonce {
  dataDescriptor: string
  dataValue: string
}

export async function startCheckout(
  lines: ResolvedLine[],
  _subtotal: number,
  payment: PaymentNonce,
): Promise<CheckoutResult> {
  if (!lines.length) {
    return {
      ok: false,
      message: 'Your bag is empty.',
    }
  }

  if (!payment.dataValue) {
    return {
      ok: false,
      message: 'Payment information is missing.',
    }
  }

  const siteUrl = convexSiteUrl()

  if (!siteUrl) {
    return {
      ok: false,
      message: 'Payment service is not configured.',
    }
  }

  try {
    const response = await fetch(`${siteUrl}/authorize-net-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: lines.map((line) => ({
          productId: line.product.id,
          length: line.length,
          quantity: line.quantity,
        })),
        payment,
      }),
    })

    const data = (await response.json()) as {
      ok?: boolean
      message?: string
      transactionId?: string
    }

    if (!response.ok || !data.ok) {
      return {
        ok: false,
        message: data.message || 'Payment could not be completed.',
      }
    }

    return {
      ok: true,
      message: data.message || 'Payment successful.',
      transactionId: data.transactionId,
    }
  } catch (error) {
    console.error('[Calary] checkout error', error)

    return {
      ok: false,
      message: 'Unable to connect to the payment service. Please try again.',
    }
  }
}