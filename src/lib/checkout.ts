import type { ResolvedLine } from '@/store/cart'

export interface CheckoutResult {
  ok: boolean
  message: string
}

/**
 * Payment is deliberately not wired up in this build.
 *
 * Calary sells in USD from Maryland, so Stripe Checkout is the shortest path:
 * create the session on your server and redirect to the URL it returns.
 *
 *   POST https://api.stripe.com/v1/checkout/sessions
 *
 * Keep the secret key on the server — never ship it to the browser. Stripe
 * amounts are in cents, so send `subtotal * 100`.
 */
export async function startCheckout(
  lines: ResolvedLine[],
  subtotal: number,
): Promise<CheckoutResult> {
  if (!lines.length) {
    return { ok: false, message: 'Your bag is empty.' }
  }

  console.info('[Calary] checkout requested', {
    amountCents: subtotal * 100,
    items: lines.map((line) => ({
      id: line.product.id,
      length: line.length,
      quantity: line.quantity,
    })),
  })

  return {
    ok: false,
    message: 'Payment is not connected yet — wire up Stripe in src/lib/checkout.ts.',
  }
}
