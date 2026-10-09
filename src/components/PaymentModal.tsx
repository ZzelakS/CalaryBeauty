import { useEffect, useState, type FormEvent } from 'react'
import type { ResolvedLine } from '@/store/cart'
import { formatPrice } from '@/data/products'
import { startCheckout } from '@/lib/checkout'
import { ShaderButton } from './ShaderButton'

interface PaymentModalProps {
  open: boolean
  lines: ResolvedLine[]
  subtotal: number
  onClose: () => void
  onSuccess: (message: string) => void
}

interface AcceptResponse {
  messages: {
    resultCode: 'Ok' | 'Error'
    message?: Array<{
      code: string
      text: string
    }>
  }
  opaqueData?: {
    dataDescriptor: string
    dataValue: string
  }
}

interface Accept {
  dispatchData: (
    paymentData: {
      authData: {
        apiLoginID: string
        clientKey: string
      }
      cardData: {
        cardNumber: string
        month: string
        year: string
        cardCode: string
      }
    },
    callback: (response: AcceptResponse) => void,
  ) => void
}

declare global {
  interface Window {
    Accept?: Accept
  }
}

const ACCEPT_JS_URL = 'https://js.authorize.net/v1/Accept.js'

export function PaymentModal({
  open,
  lines,
  subtotal,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return

    if (window.Accept) {
      setLoaded(true)
      return
    }

    const existing = document.querySelector(
      `script[src="${ACCEPT_JS_URL}"]`,
    )

    if (existing) {
      const handleLoad = () => setLoaded(true)
      existing.addEventListener('load', handleLoad)

      return () => {
        existing.removeEventListener('load', handleLoad)
      }
    }

    const script = document.createElement('script')
    script.src = ACCEPT_JS_URL
    script.async = true

    const handleLoad = () => setLoaded(true)

    script.addEventListener('load', handleLoad)
    script.addEventListener('error', () => {
      setError('Unable to load the secure payment form.')
    })

    document.head.appendChild(script)

    return () => {
      script.removeEventListener('load', handleLoad)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setBusy(false)
      setError('')
    }
  }, [open])

  if (!open) return null

  const submitPayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!loaded || !window.Accept) {
      setError('Secure payment form is still loading. Please try again.')
      return
    }

    const apiLoginID =
      import.meta.env.VITE_AUTHORIZENET_API_LOGIN_ID as string | undefined

    const clientKey =
      import.meta.env.VITE_AUTHORIZENET_CLIENT_KEY as string | undefined

    if (!apiLoginID || !clientKey) {
      setError('Payment configuration is incomplete.')
      return
    }

    const form = event.currentTarget

    const formData = new FormData(form)

    const cardNumber = String(formData.get('cardNumber') || '')
      .replace(/\s+/g, '')
      .trim()

    const month = String(formData.get('month') || '')
      .trim()

    const year = String(formData.get('year') || '')
      .trim()

    const cardCode = String(formData.get('cardCode') || '')
      .trim()

    if (!cardNumber || !month || !year || !cardCode) {
      setError('Please enter all card details.')
      return
    }

    setBusy(true)
    setError('')

    window.Accept.dispatchData(
      {
        authData: {
          apiLoginID,
          clientKey,
        },
        cardData: {
          cardNumber,
          month,
          year,
          cardCode,
        },
      },
      async (response) => {
        if (response.messages.resultCode !== 'Ok' || !response.opaqueData) {
          const message =
            response.messages.message?.[0]?.text ||
            'Unable to securely process your card details.'

          setError(message)
          setBusy(false)
          return
        }

        const result = await startCheckout(lines, subtotal, {
          dataDescriptor: response.opaqueData.dataDescriptor,
          dataValue: response.opaqueData.dataValue,
        })

        if (!result.ok) {
          setError(result.message)
          setBusy(false)
          return
        }

        form.reset()
        setBusy(false)

        onSuccess(
          result.transactionId
            ? `${result.message} Transaction ID: ${result.transactionId}`
            : result.message,
        )
      },
    )
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/50 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-ink/10 bg-[#FBF6EF] shadow-2xl">
        <div className="flex items-start justify-between border-b border-ink/10 px-6 py-5">
          <div>
            <p className="hud text-mocha">Secure checkout</p>
            <h2
              id="payment-title"
              className="display mt-1 text-3xl text-ink"
            >
              Complete your order
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-2xl leading-none text-mocha transition-colors hover:text-ink disabled:opacity-40"
            aria-label="Close payment"
          >
            ×
          </button>
        </div>

        <form onSubmit={submitPayment} className="space-y-5 px-6 py-6">
          <div className="border border-ink/10 bg-white/40 p-4">
            <div className="flex items-baseline justify-between">
              <span className="hud text-mocha">Order total</span>
              <span className="font-mono text-sm text-gold">
                {formatPrice(subtotal)}
              </span>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-mocha">
              Your payment is securely processed by Authorize.net.
              Your card details are sent directly to the payment gateway.
            </p>
          </div>

          <div>
            <label
              htmlFor="calary-card-number"
              className="hud text-mocha"
            >
              Card number
            </label>

            <input
              id="calary-card-number"
              name="cardNumber"
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              required
              disabled={busy || !loaded}
              className="mt-2 w-full border border-ink/15 bg-transparent px-4 py-3 font-mono text-sm outline-none transition-colors focus:border-gold disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="calary-card-month"
                className="hud text-mocha"
              >
                Expiry month
              </label>

              <input
                id="calary-card-month"
                name="month"
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp-month"
                placeholder="MM"
                maxLength={2}
                required
                disabled={busy || !loaded}
                className="mt-2 w-full border border-ink/15 bg-transparent px-4 py-3 font-mono text-sm outline-none transition-colors focus:border-gold disabled:opacity-50"
              />
            </div>

            <div>
              <label
                htmlFor="calary-card-year"
                className="hud text-mocha"
              >
                Expiry year
              </label>

              <input
                id="calary-card-year"
                name="year"
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp-year"
                placeholder="YY"
                maxLength={2}
                required
                disabled={busy || !loaded}
                className="mt-2 w-full border border-ink/15 bg-transparent px-4 py-3 font-mono text-sm outline-none transition-colors focus:border-gold disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="calary-card-code"
              className="hud text-mocha"
            >
              Security code
            </label>

            <input
              id="calary-card-code"
              name="cardCode"
              type="password"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="CVV"
              maxLength={4}
              required
              disabled={busy || !loaded}
              className="mt-2 w-full border border-ink/15 bg-transparent px-4 py-3 font-mono text-sm outline-none transition-colors focus:border-gold disabled:opacity-50"
            />
          </div>

          {error ? (
            <div className="border border-red-900/20 bg-red-50/50 px-4 py-3 text-sm leading-relaxed text-red-900">
              {error}
            </div>
          ) : null}

          <div className="pt-2">
            <ShaderButton
              full
              type="submit"
              disabled={busy || !loaded}
            >
              {busy
                ? 'Processing payment…'
                : !loaded
                  ? 'Loading secure checkout…'
                  : `Pay ${formatPrice(subtotal)}`}
            </ShaderButton>
          </div>

          <p className="text-center text-[11px] leading-relaxed text-mocha/70">
            Secure payment powered by Authorize.net.
          </p>
        </form>
      </div>
    </div>
  )
}