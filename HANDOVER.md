# Calary Beauty — direct booking and dynamic checkout

This update replaces the email/request flow with Authorize.net deposit payment.

## Appointment checkout

Customers choose a service, length, extras, date and time, accept the policies, and continue directly to checkout. The required deposit is always USD $50, enforced by the server. Successful payment books exactly the customer's selected date and time in America/New_York (Baltimore studio time), with no studio approval step. The deposit is deducted from the service total to show the balance due at the appointment.

Appointment checkout collects contact details, billing name/address and card details. It has no shipping section, shipping amount or shipping address sent to Authorize.net. Appointment payment records also omit shipping data.

Thigh length has been removed from every knotless service. Cornrows have been removed entirely. Regular-braid thigh options remain. There are now 11 service cards.

The flow accepts future appointment times as requested. It does not check a separate capacity calendar, block overlapping appointments, assign stylists, or send separate studio notifications. Paid appointment details are retained in the private Convex `paymentRecords` table, including the exact date/time and studio timezone. The client must monitor these records; there is no new appointments management screen in this update.

## Product checkout

Product checkout collects email, phone, billing first/last name and address, and shipping first/last name and address. Shipping defaults to the billing address; unchecking that option reveals independent recipient and delivery fields.

Address parts are country code, street, apartment/suite, city, state/province/region and postal code. Optional company is supported. Country values use ISO alpha-2 codes. US state values require two letters. Shared browser/server validation enforces Authorize.net limits: names/company 50, combined street and apartment 60, city/state 40, postal code 20, phone 25 and email 255. Street and apartment stay separate in the stored customer payload and are combined only when mapping to Authorize.net's address field. This preserves useful address structure for later shipping-rate calculation.

Product shipping currently remains $0, matching the previous backend's charged total; no address-based fee is calculated yet. Product gateway requests include a $0 shipping item. Appointment requests do not include this item. A future shipping calculator should operate only on product orders, using the normalized shipping address server-side, and include the resulting fee in the displayed and server-enforced total.

## Authorize.net integration

Both checkout types reuse `PaymentModal` and `CustomerFields`. Accept.js receives the cardholder name and billing ZIP, tokenizes card data, and only its opaque token reaches the backend. Raw card number and CVV are removed from the form after tokenization. Raw card details and payment nonces are not stored in payment records.

The server sends customer email, `billTo`, product-only `shipTo`, invoice/description, line items and appointment metadata as applicable. Product prices and deposit amount are calculated on the server. Private payment records keep the normalized customer/order or booking payload for fulfillment and future shipping work.

Checkout references guard against repeat charging of the same submission. Concurrent or ambiguous requests require review; explicit declined payments may be retried. If network/gateway results are uncertain, the browser keeps only the checkout reference in session storage and blocks another payment attempt in that tab until review. The studio should reconcile the reference against Authorize.net and the private payment record before allowing a fresh attempt. No automated gateway reconciliation or refund workflow was added.

Documentation used:
- https://developer.authorize.net/api/reference/index.html — transaction, customer, billing/shipping, line item and field contracts.
- https://developer.authorize.net/api/reference/features/acceptjs.html — tokenization, cardholder name, ZIP and environment selection.

## Configuration and deployment

Deploy the updated Convex functions and schema as well as the frontend. The new private `paymentRecords` table is required. No live deployment was made by this task.

Frontend public settings:
- `VITE_CONVEX_URL` / `VITE_CONVEX_SITE_URL` as described in the existing project configuration.
- `VITE_AUTHORIZENET_API_LOGIN_ID` and `VITE_AUTHORIZENET_CLIENT_KEY`.
- `VITE_AUTHORIZENET_ENV=sandbox` for testing, or `production` for live mode.

Convex server settings:
- `AUTHORIZENET_API_LOGIN_ID`.
- `AUTHORIZENET_TRANSACTION_KEY` — keep this server-only.
- `AUTHORIZENET_ENV=sandbox` for testing, or `production` for live mode.

Both environment settings must match the merchant credentials. Enable customer email receipts in the Authorize.net Merchant Interface if receipts are desired. Missing merchant configuration blocks payment; there is no email/payment-link fallback.

Service photos/prices are maintained in `shared/services.ts`. Empty image fields render placeholders. Add photos to `public/services/` and use their public paths in the corresponding image fields.

## Verification

`npm run build` and backend TypeScript validation passed. Eight Convex/Vitest tests passed using an entirely mocked payment gateway, covering the fixed $50 deposit, customer/AVS address mapping, selected appointment time, payment deduplication, removed options, rejected invalid addresses/appointments, server-priced product orders, ambiguous gateway failure and product-only shipping.

Browser checks verified direct booking checkout, preserved selected date/time and $50 amount, absent appointment shipping fields, product shipping toggle and separate delivery fields. No live card was entered, charged or stored. Live Authorize.net processing and merchant receipt delivery remain unverified until configured and tested in sandbox.

The test tools use a separate dependency directory to keep the application's Vite 5 build unchanged while running current Vitest/convex-test versions. To repeat: `npm ci --prefix tools/payment-tests`, then `npm --prefix tools/payment-tests test`. Backend types: `npx tsc --noEmit -p convex/tsconfig.json`.

## Latest additions: wallets and product errors

Apple Pay merchant validation and encrypted-token payment, plus Authorize.net PayPal Express Checkout initiation and server-confirmed capture, are prepared behind disabled-by-default environment settings. Checkout displays enabled wallet methods dynamically. The unchanged $50/no-shipping appointment rules apply to both. PayPal redirects never count as paid without a successful capture response; private state and capture claims guard against repeated charging. Wallet integration is not activated or live-tested.

Product saves now return structured, readable validation and access errors. The editor translates connection, deployment and format errors, keeps form entries on failure and gives a support reference for unexpected server errors when available. Extra photos remain editable and are saved as URL/file-ID pairs. See `SETUP.md` for the full connection and deployment instructions; product details go to Convex and photo files go to ImageKit.

The build and backend types pass. There are now 17 passing tests across payment and product coverage. Wallet-specific checks use mocked gateway responses; real Apple merchant validation and PayPal browser approval still require configured sandbox testing.

## Admin services and appointments

The dashboard at `/admin` now has Products, Braiding services and Appointments sections. Braiding services lists the existing 11 styles as editable entries immediately. The first service edit, deletion or extras save atomically imports the starter styles into Convex once; later changes use the stored catalogue. Administrators can add, edit, hide or delete styles, categories, lengths, prices and service photos, and edit shared extras. Hidden/deleted styles cannot be booked. Removing the entire stored catalogue leaves it empty rather than restoring starters. Knotless/cornrow thigh lengths remain disallowed; every base price must cover the fixed $50 deposit.

Both booking form and checkout read the live service catalogue. The payment server validates the selected service, length and extras against the same live data and stores the service total/name as a booking snapshot. Existing paid appointments retain their original service information when styles change.

Appointments shows paginated paid bookings, contact information, selected time, service total/deposit and notes. Admin can amend date/time, add studio notes and mark confirmed/completed/cancelled. Amendments preserve the original booking payload and payment record; cancellation does not issue a refund or send notifications. New appointment opens the customer booking page and requires the $50 payment flow.

Products no longer fall back to static starter cards on an empty connected catalogue or without a deployment. To import editable starter products, use Products > Load starter catalogue. It inserts real Convex records; there is no automatic reseeding after deletion. New product remains available for creating your own catalogue.

Deploy the new `services` and `serviceSettings` tables/functions, appointment queries/mutations, payment record fields/index and frontend together. The existing approved-admin account and ImageKit setup apply. No live deployment or signed-in admin browser session was performed. Build/backend type checks and 23 automated tests pass; added coverage checks service migration/editing, live payment prices/extras, hidden/deleted catalogue behavior, access control and appointment amendments preserving deposits.

## Fullscreen photo viewer

Product gallery images and braiding-style photos now use `src/components/ImageViewer.tsx`. It fills the viewport with a contained image on a dark background, an × close control and icon-only previous/next arrows when more than one photo exists. Mobile horizontal swipes and keyboard arrow keys navigate, wrapping around the gallery. Escape closes and restores focus. Product photos navigate within the same product; braiding photos navigate across styles with uploaded photos. Booking, policy and checkout dialogs keep their existing layout.

To install only this frontend change, copy `ImageViewer.tsx`, the updated `ProductGallery.tsx` and `Visit.tsx`, and the `.image-viewer` CSS rules from `src/index.css`. Rebuild and publish the frontend. No additional Convex deployment is needed for this viewer change. Build passed; device swipe behavior was not tested in a live browser session.

## React #301 correction

The earlier error-handling patch created fresh query request objects for `useQueries` on every render. Convex's subscription hook detects changing request identity and schedules another render. On subsequent renders this could repeat indefinitely. Both the root service provider and the admin services view now use stable module-level request objects.

Mounted React tests explicitly reproduce the old error after a parent update, and pass with the corrected requests. The production build and all 31 tests pass. Publish the corrected frontend to install this fix. No backend/schema change is required specifically for React #301. The earlier live service server error remains a separate issue requiring the private Convex log; this patch handles that failure without unmounting the storefront.

## Appointments tab protection

The appointment list's paginated query could throw during rendering and unmount the entire dashboard. A section error boundary now isolates this failure, retains the dashboard tabs, displays the support request reference and offers retry. A mounted React test checks failure isolation and successful retry.

The backend normalizes historical payment payloads per appointment. Missing fields, null objects or malformed JSON no longer fail the entire page. Those records remain visible with a review label and their original checkout reference/deposit. No stored payment payloads are rewritten or deleted. This addresses a potential record-format failure, but the supplied browser error does not reveal whether it is the actual live server cause. The production Convex log for `appointments:list` request `a10b8bea7bf97401` is required to identify that cause; the separate `services:listPublic` error is also still reported by the live frontend.

Deploy the updated backend with `npx convex deploy` to the existing Calary production deployment, then publish the updated frontend. Preserve your environment settings. Production build, backend types and all 33 automated tests passed. No live deployment or access to private production logs was performed.
