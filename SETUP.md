# Connect product saving, image uploads and wallets

## Product photos and details

The existing Add/Edit Product form supports the main image and any number of extra images. Use **Add another photo** to add extra slots, and remove slots you do not need. Existing photos load when reopening a product for editing. Each photo can be uploaded or entered as an image URL.

You do not send the full product to `convex/imagekit.ts`. The flow is:

1. `convex/imagekit.ts` signs a short-lived upload authorization with the private ImageKit key.
2. The browser uploads each photo directly to ImageKit.
3. ImageKit returns its URL and file ID to the form.
4. Saving sends the product, main image and extra `images: [{url, fileId}]` to `convex/products.ts`.
5. Convex stores these fields in the `products` table. Replacement/removal schedules deletion of old ImageKit files.

`convex/schema.ts` and the product save mutation already accept main `image`, optional `imageFileId` and the optional `images` array. You do not need another upload API or manual schema edits for extra images.

## Local setup

Install Node.js dependencies in the extracted project:

```sh
npm install
cp .env.example .env.local
npx convex dev
```

The Convex command signs in and selects/creates the deployment, generates the API types and uploads the functions/schema. Keep it running for local development. Set these frontend values in `.env.local` using your own account:

```dotenv
VITE_CONVEX_URL=https://YOUR-DEPLOYMENT.convex.cloud
VITE_IMAGEKIT_PUBLIC_KEY=YOUR_PUBLIC_KEY
VITE_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/YOUR_IMAGEKIT_ID
VITE_IMAGEKIT_FOLDER=/calary/products
```

The image authorization URL is derived from your Convex deployment automatically. If using a separate signer, set `VITE_IMAGEKIT_AUTH_ENDPOINT`. Set private values on the matching Convex deployment, not in browser variables:

```sh
npx convex env set ADMIN_EMAILS 'your-approved-admin@example.com'
npx convex env set IMAGEKIT_PRIVATE_KEY 'YOUR_PRIVATE_IMAGEKIT_KEY'
npx convex env set SITE_URL 'http://localhost:5173'
```

Use the exact local origin served by Vite for local image upload CORS. Sign into `/admin` with an email listed in `ADMIN_EMAILS`. If signing into an existing account, its email must match the approved address. Then start the frontend:

```sh
npm run dev
```

Try adding a product with a main photo and two extra photos. Save, reopen Edit, and verify all three photos remain. If the dashboard says product editing is not configured, set the allowlist on the deployment used by the frontend. If image upload setup is incomplete, check the private key in that deployment and the two public ImageKit values in the frontend.

## Production deployment

Deploy the backend/schema and frontend together. `npx convex deploy` deploys to the project's configured production Convex deployment. Use the Convex dashboard to set production `ADMIN_EMAILS`, `IMAGEKIT_PRIVATE_KEY`, `SITE_URL` and payment settings there; local/development environment settings do not automatically transfer. Set `SITE_URL` to the real HTTPS website origin, with no trailing path. Set the frontend's `VITE_CONVEX_URL` to that production deployment and rebuild (`npm run build`) before publishing `dist/`. Configure the host to serve `index.html` for SPA routes, including `/admin` and `/wallet-return`.

The existing Convex Auth setup also needs its deployment settings from the project's authentication setup. Preserve those when updating an existing deployment. No live environment or account was configured by this update.

## Card payment

Replace the example public Authorize.net values with your own merchant's API login ID and public client key. Server-only `AUTHORIZENET_API_LOGIN_ID` and `AUTHORIZENET_TRANSACTION_KEY` belong in Convex. Match `VITE_AUTHORIZENET_ENV` and server `AUTHORIZENET_ENV` to `sandbox` for test credentials or `production` for live credentials.

## Apple Pay — prepared, disabled by default

1. Register the Apple merchant identifier and website domain. Serve Apple's domain-association file at the required `.well-known` path on the real HTTPS website.
2. Enable Apple Pay in the Authorize.net Merchant Interface. Use the CSR provided by Authorize.net for the Apple **payment processing certificate**, and upload the resulting certificate to Authorize.net. This lets the gateway decrypt the payment token.
3. Separately create the Apple **merchant identity certificate**, which this server uses for web merchant validation. Set these private Convex variables:

```text
APPLE_PAY_MERCHANT_ID=merchant.YOUR_IDENTIFIER
APPLE_PAY_MERCHANT_CERT_PEM=<merchant identity certificate in PEM format>
APPLE_PAY_MERCHANT_KEY_PEM=<matching private key in PEM format>
AUTHORIZENET_APPLE_PAY_ENABLED=true
SITE_URL=https://YOUR_REAL_WEBSITE
```

4. Frontend: `VITE_APPLE_PAY_ENABLED=true`, `VITE_APPLE_PAY_COUNTRY=US` (use the merchant's actual country), and rebuild.
5. Test on an eligible Apple Pay device/browser over HTTPS. Unsupported devices do not show the option.

The `/authorize-net-apple-pay-session` endpoint requires the configured website origin, validates Apple's gateway host and uses a Node action with the merchant identity certificate for mutual TLS. The browser base64-encodes the encrypted Apple payment data and sends `COMMON.APPLE.INAPP.PAYMENT` to the shared checkout endpoint. Certificates/private keys remain server-side. The Apple payment-processing certificate and merchant-identity certificate serve different purposes and cannot be substituted for each other.

## PayPal through Authorize.net — prepared, disabled by default

1. Link the PayPal merchant account through Authorize.net's **Account > Digital Payment Solutions > PayPal** settings. This integration uses Authorize.net Express Checkout, so a separate PayPal REST client ID/secret is not required here. Availability depends on merchant/reseller eligibility.
2. Server: `AUTHORIZENET_PAYPAL_ENABLED=true`, real HTTPS `SITE_URL`, and the matching Authorize.net credentials/environment.
3. Frontend: `VITE_PAYPAL_ENABLED=true`; rebuild. Allow the checkout popup.
4. Test with a linked PayPal sandbox merchant and sandbox buyer before using production.

The shared checkout endpoint starts `authCaptureTransaction` and returns the secure PayPal approval URL. `/wallet-return` passes the result back to the original checkout window. The private record binds the stored amount and original transaction ID to an unpredictable return state; `/authorize-net-paypal-complete` uses `authCaptureContinueTransaction` to confirm and capture. Redirects alone never mark an order/appointment paid. Repeated completion requests do not capture twice. Closed/cancelled/uncertain sessions remain blocked for studio review rather than triggering another payment automatically.

Both wallets use the existing dynamic checkout: appointment deposits are always $50 with no shipping fields or charges; product orders retain delivery addresses and currently have $0 shipping.

## Validation and remaining configuration

Application build, backend types and 17 automated tests passed using a mocked gateway. Tests include wallet disabled behavior, Apple encrypted tokens, PayPal pending/capture, wrong return state and repeated/uncertain captures, structured product errors and editing multiple extra photos. Real merchant validation, PayPal approval popups and payment settlement must be verified with the configured sandbox accounts/certificates; they were not exercised live.

References:
- https://developer.authorize.net/api/reference/features/paypal.html
- https://developer.authorize.net/api/reference/features/in-app.html
- https://developer.authorize.net/api/reference/index.html
- https://developer.apple.com/apple-pay/implementation/

## Where to manage braid styles and appointments

After deploying this update, open `/admin` and sign in with an approved studio email.

- **Products**: New product creates your own item. Load starter catalogue imports the sample products into Convex so you can edit or delete them. Static starter cards are no longer shown automatically.
- **Braiding services**: Click New service to add a style. Click Edit beside any starter style to change its photo, category, row description, lengths, prices or visibility. Add length creates another priced option. Edit extras manages shared add-ons. The first save moves the starter styles into Convex automatically; you do not need to seed these manually or change source files.
- **Appointments**: View paid bookings and click Edit appointment to amend date/time, status or studio notes. New appointment opens the booking form and keeps the required $50 deposit. Cancellation records a status only; arrange any refund separately in the payment gateway.

Service photos use the same ImageKit connection as product photos. The new service catalogue and appointment management require the updated Convex schema/functions and frontend to be deployed together. A frontend-only upload will not install these admin features on the backend. Repeat `npx convex dev` for development or `npx convex deploy` for your configured production deployment, then rebuild and publish the frontend.

## Fullscreen photo viewer

Product gallery images and braiding-style photos now use `src/components/ImageViewer.tsx`. It fills the viewport with a contained image on a dark background, an × close control and icon-only previous/next arrows when more than one photo exists. Mobile horizontal swipes and keyboard arrow keys navigate, wrapping around the gallery. Escape closes and restores focus. Product photos navigate within the same product; braiding photos navigate across styles with uploaded photos. Booking, policy and checkout dialogs keep their existing layout.

To install only this frontend change, copy `ImageViewer.tsx`, the updated `ProductGallery.tsx` and `Visit.tsx`, and the `.image-viewer` CSS rules from `src/index.css`. Rebuild and publish the frontend. No additional Convex deployment is needed for this viewer change. Build passed; device swipe behavior was not tested in a live browser session.
