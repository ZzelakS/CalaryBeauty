# Stripe and Affirm — setup and deployment

This update replaces Authorize.net with Stripe Checkout for all new payments. It is based on the calary-beauty2 4.zip supplied on October 26. The source package omits private .env files, node_modules, Git history and generated dist output.

## What customers see

- Products: credit/debit card through Stripe, or Affirm when enabled. The server adds your flat $10 shipping fee once per order.
- Appointments: card checkout for the selected service’s mandatory $20 or $50 deposit. No shipping address or fee. Affirm is unavailable for deposits.
- Card details are entered only on Stripe’s hosted page. This app no longer loads Accept.js or handles card numbers/CVV. Stripe may display supported wallets such as Apple Pay when available for your account, browser and customer. The old PayPal/Apple Pay integrations have been removed.
- The existing billing/contact and delivery form is retained. Customers review billing and, for products, delivery information again on Stripe Checkout. Stripe-confirmed delivery details are authoritative in Admin > Orders. Appointments use Stripe’s confirmed contact details too.
- Successful payment returns to /stripe-return. This page verifies the saved order against Stripe before showing success. An unfinished checkout can be resumed or explicitly cancelled. Cancellation expires the open Stripe Session; a completed payment cannot be cancelled through this button.

## 1. Activate Stripe and Affirm

Create/activate the Calary Beauty business’s Stripe account. Enable card payments, then enable Affirm in Stripe Dashboard > Settings > Payment methods. Affirm activation is subject to Stripe/Affirm eligibility and approval.

The Affirm route in this implementation is for USD product purchases with US billing and delivery addresses, $35–$30,000 including shipping. Plans and approval are determined by Affirm; the site does not promise interest-free financing or approval. Card checkout remains available when Affirm is disabled.

See https://docs.stripe.com/payments/affirm and https://docs.stripe.com/payments/affirm/accept-a-payment.

## 2. Set the private Convex variables

Use Convex Dashboard > the existing fiery-perch-583 production deployment > Settings > Environment Variables. Start on a separate development/preview deployment with Stripe test keys if possible, so the live shop is not placed in test mode.

| Variable | Test setting | Live setting |
| --- | --- | --- |
| STRIPE_ENABLED | true | true |
| STRIPE_MODE | test | live |
| STRIPE_SECRET_KEY | Your sk_test_… key | Your sk_live_… key |
| STRIPE_WEBHOOK_SECRET | Test endpoint’s whsec_… secret | Live endpoint’s whsec_… secret |
| STRIPE_AFFIRM_ENABLED | true after test enablement | true after Affirm activation |
| SITE_URL | Your test frontend’s exact origin | https://www.calarybeauty.com |

The mode must match the secret-key prefix. Use the standard secret key for the same Stripe account as the webhook. Do not prefix any secret with VITE_, place it in frontend hosting settings, or commit it. No Stripe publishable key is needed for this redirect-based integration.

SITE_URL controls return URLs and checkout CORS; both www and apex variants are accepted for HTTPS. Local HTTP localhost/127.0.0.1 is permitted only in test mode. Configure your local frontend port exactly if testing locally. Keep existing auth, ImageKit and newsletter variables.

## 3. Register the webhook in Stripe

In the matching Stripe test/sandbox account (later repeat in live mode):

1. Open Workbench > Webhooks > Create event destination.
2. Select **Your account** and **Snapshot** payload format (not thin events).
3. Add these event types:
   - checkout.session.completed
   - checkout.session.async_payment_succeeded
   - checkout.session.async_payment_failed
   - checkout.session.expired
   - charge.refunded
4. Use this endpoint for Fiery:

   https://fiery-perch-583.convex.site/stripe-webhook

   This is .convex.site, not .convex.cloud and not your frontend /stripe-return URL. For a development deployment, substitute that deployment’s .convex.site host.
5. Reveal the endpoint signing secret and save it as STRIPE_WEBHOOK_SECRET in that same Convex deployment.
6. Prefer API version **2025-02-24.acacia** for the snapshot destination to match the pinned REST integration. The handler retrieves Checkout Sessions from Stripe at that pinned version, so it does not trust mutable or out-of-order event snapshots for payment status.

The backend checks the exact raw-body HMAC signature and a five-minute timestamp tolerance. Duplicate/out-of-order events do not create duplicate orders or roll paid payments back. Refund events read the PaymentIntent metadata from Stripe to locate the original order.

Stripe reference: https://docs.stripe.com/webhooks and https://docs.stripe.com/api/versioning.

## 4. Deploy the backend and frontend

Restore your existing private configuration locally into the extracted calary-beauty2 folder. Your .env.production.local must contain the real deployment key for Fiery. It is not supplied in this archive.

```bash
npm ci
npx convex deploy --env-file .env.production.local
```

Confirm https://fiery-perch-583.convex.cloud. This deploy adds optional Stripe fields and a small rate-limit table; it retains historical orders and appointments. No data reseeding is needed for Stripe. Previously created natural-style services remain editable; if they were never installed, use Admin > Braiding services > Add men’s & kids’ styles.

In frontend hosting settings:

```env
VITE_CONVEX_URL=https://fiery-perch-583.convex.cloud
VITE_STRIPE_AFFIRM_ENABLED=true
```

Set the Affirm flag to false until it is approved/configured. Redeploy the frontend from the updated source. For manual hosting, run npm run build and upload dist/. Existing Vercel SPA rewrites support /stripe-return. Remove obsolete VITE_AUTHORIZENET_*, VITE_APPLE_PAY_* and VITE_PAYPAL_* variables from frontend hosting; the new code never reads them.

Deploy backend and frontend together during the payment cutover. Old cached frontend tabs calling the removed Authorize.net endpoints must reload. Review any pending old-provider payments before starting another checkout. Historical payment payloads are not deleted or rewritten. Old server credentials can be removed from Convex after you finish reconciling old transactions; manage old-provider refunds in that provider’s portal.

## 5. Verify in test mode

- Product card order: check the subtotal + $10 once, shipping address in Stripe, and Admin > Orders changing processing to paid.
- Test card: 4242 4242 4242 4242, any future expiry and any three-digit CVC. Use only with Stripe test keys. See https://docs.stripe.com/testing.
- Affirm: choose a US product order in the supported range, complete Stripe/Affirm’s test approval flow and verify a paid order. Also test decline/cancellation. Follow the current Affirm test instructions linked from https://docs.stripe.com/payments/affirm/accept-a-payment.
- Book a natural style: verify $20 is charged and the remaining service balance is correct. Book an existing standard style: verify $50. Neither should contain shipping or offer Affirm.
- Check the enforced hours: Mon–Fri 9:30am–7pm; Saturday 9am–7pm; Sunday closed. Times are America/New_York. The chosen time and notes are saved in the paid appointment.
- Close/return from an unpaid checkout: payment must remain unconfirmed. Resume or cancel it before another payment. Refreshing a confirmed receipt re-verifies its status using the saved session token.
- Inspect Stripe webhook deliveries: successful events should return 200. If delivery fails, correct the configuration and resend the event in Stripe. A provider success redirect alone does not fulfil an order.
- Test a partial/full refund from the Stripe dashboard. Confirm the refund amount appears beside the original order/appointment. Original paid amount stays recorded for audit.

To go live, activate the business, repeat webhook setup in Stripe live mode, and replace test settings with matching live settings. A test webhook signing secret does not verify live events. Do not test live mode with real card details as a substitute for Stripe’s test flow.

## Operations and limits

Admin > Orders shows product payments, provider, status, original totals, item snapshots and Stripe-confirmed contact/delivery details. Admin > Appointments continues to show paid deposits, chosen times and refund amounts. Tokens, raw Stripe request parameters and private keys are not exposed by the admin order query.

New sessions expire after one hour. Starting checkout locks the browser session against another payment while its result is unknown. Resume uses the same saved Stripe idempotency key and request parameters. An uncertain creation older than 23 hours requires staff review; it is never silently recreated after Stripe’s idempotency retention window. Do not change Stripe accounts while payments are pending.

Stock is checked against the server catalogue when a new Session is created; this is availability toggling, not quantity reservation. A Session already open at Stripe can still complete after a later stock change. Review pending orders before changing availability. Scheduling retains the existing chosen-time model; it does not add appointment-duration calculations or overlapping-booking prevention.

The server accepts at most 60 new sessions/hour globally; retries reuse the saved session. Amount/currency/mode/order association are checked before recording payment. Card and Affirm refund requests are made in Stripe Dashboard, not through a new public refund API. Refund webhooks mirror refunded amounts in admin. Disputes/chargebacks and fulfilment remain managed by staff in Stripe; their statuses are not automatically mirrored in this update. No automatic transactional email or campaign feature is added by this payment change.

No new runtime dependency was added: Convex uses Stripe’s HTTPS REST API and Web Crypto signature verification. Generated Convex API bindings regenerate on deployment.

## Verification performed here

Production build and frontend/backend type checks pass. Automated tests cover server pricing/shipping, card and Affirm paths, $20/$50 deposits, booking hours/policy, stock and lengths, US/amount/mode checks, origin restrictions, idempotent recovery, signed webhook validation, tampered and duplicate/out-of-order events, cancellation races, private status tokens, admin access, refunds, and checkout rendering without raw card fields.

No Stripe credentials were loaded, no real provider requests/payments were made, and nothing was deployed. Provider interactions in tests were mocked. Native browser preview was unavailable because the sandbox blocked the local listening port; checkout rendering was verified with automated tests. Complete the Stripe test-mode checks above before live use.
