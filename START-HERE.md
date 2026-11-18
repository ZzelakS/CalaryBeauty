# Calary Beauty — Stripe + Affirm update (October 26)

Start with STRIPE-SETUP.md. This version uses Stripe for all new payments. Authorize.net checkout, wallet controls and HTTP payment endpoints have been removed. Historical payment records remain intact.

1. Restore your private .env.local and .env.production.local files locally. They are excluded from this ZIP.
2. Configure Stripe keys, mode and webhook in Convex as described in STRIPE-SETUP.md.
3. Run npm ci, then npx convex deploy --env-file .env.production.local. Confirm fiery-perch-583.
4. Set frontend VITE_CONVEX_URL=https://fiery-perch-583.convex.cloud and VITE_STRIPE_AFFIRM_ENABLED=true only when Affirm is activated. Deploy the updated frontend.
5. Verify payments in Stripe test mode before switching to matching live keys and a live webhook.

No live deployment or provider transaction has been performed. Existing booking hours, service deposits, stock, newsletter and contact features are preserved.
