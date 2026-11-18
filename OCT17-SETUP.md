# Stock, subscription emails and contact page

## Stock management

Admin > Products has an In stock switch for each product. The product editor also has an In stock checkbox. Turn it off to keep the item visible with an Out of stock overlay while blocking Add to bag. Product visibility (Live/Draft) is separate from stock.

Existing products are available by default. No bulk migration or reseeding is needed. Out-of-stock items already in a customer's bag are identified, and checkout is blocked until removed. The payment server independently checks stock for new card, Apple Pay and PayPal checkout requests. This is a per-product availability toggle covering all lengths; it does not track quantities or reserve units during payment.

## Public contact page

/contact contains:
- 31 Mountain Green Cir, Windsor Mill, MD 21244.
- Google Map iframe and a directions link.
- The existing studio phone/WhatsApp number (+1 443 468-7243) and calarybeautystore@gmail.com.
- Booking link and newsletter signup.

The address also appears in the footer. Hours were not supplied, so no opening hours were invented. The map uses the supplied address; visitors can open it in Google Maps. Links on the site have no decorative arrows. Photo browsing controls retain their arrows.

Change contact details in src/data/contact.ts. Website links work from both the home and contact routes. The contact and confirmation pages are lazy-loaded. The map is lazy-loaded; product photo rotation stops off-screen, while the document is hidden, and for reduced-motion preferences.

## Configure subscription emails

The new signup sections appear on the home and contact pages. A visitor enters an email, agrees to receive updates and receives a confirmation email. They must open the link and click Confirm my subscription before the record becomes confirmed. Email-link scanners visiting the page do not automatically confirm it. Links expire after 24 hours. Duplicate requests do not create duplicate subscriber rows.

On Convex Dashboard > fiery-perch-583 > Settings > Environment Variables set:

NEWSLETTER_ENABLED=true
SITE_URL=https://www.calarybeauty.com
NEWSLETTER_FROM=Calary Beauty <news@notifications.calarybeauty.com>
RESEND_NEWSLETTER_API_KEY=your-private-resend-key

Use the sender for the domain you actually verified in Resend; the example sender is not automatically verified by this update. If dedicated values are absent, the code can reuse RESEND_API_KEY and BOOKING_ALERT_FROM. Never expose private keys with VITE_ or commit private environment files.

For sending only confirmation emails, a sending-access Resend key is sufficient. The new newsletter settings are server-only, so no frontend secrets are needed. A missing configuration produces an unavailable message rather than pretending the visitor is subscribed.

The public endpoint requires the configured website origin (both www and apex variants are accepted), validates email/consent, ignores honeypot submissions and allows at most 60 new confirmation requests per hour across the site by default. Set NEWSLETTER_HOURLY_LIMIT to another positive number if needed. Repeat requests for the same pending address are cooled down for 10 minutes. These controls limit email abuse; there is no CAPTCHA dependency.

Local email testing requires SITE_URL to match your local preview origin on a separate development deployment. Keep production SITE_URL on your live HTTPS domain.

## Configure campaigns in Resend

Optional: set RESEND_NEWSLETTER_SYNC=true to add confirmed signups to Resend Contacts. That API key must be allowed to read/create contacts; a sending-only key is insufficient. A dedicated RESEND_NEWSLETTER_API_KEY with the required permissions can be used instead of expanding an existing booking-email key.

Optionally create a segment and topic in Resend and set:

RESEND_NEWSLETTER_SEGMENT_ID=your-segment-id
RESEND_NEWSLETTER_TOPIC_ID=your-topic-id

New contacts are assigned to those settings when created. Existing Resend contacts retain their unsubscribe/topic preferences and are not automatically re-enabled or reassigned. Assign an existing contact to your campaign segment/topic in Resend if appropriate; respect its preferences.

Send promotional campaigns from the Resend dashboard to the chosen confirmed contact list, using Resend's unsubscribe and suppression controls. This update sends confirmation emails only; it does not automatically send a campaign or provide a bulk campaign sender inside the studio admin.

## Admin > Subscribers

The new Subscribers tab lists pending/confirmed signup records, confirmation-email acceptance/failure and contact-sync status. Private tokens are not exposed through the admin list/export. The tab is isolated by an error boundary, so a backend failure does not blank the dashboard.

Export loaded confirmed emails downloads CSV for the currently loaded confirmed rows. Load more before export to include additional pages. Signup confirmation status is an audit record, not a live mirror of subsequent Resend unsubscriptions. Resend is the source of truth for campaign unsubscribe/suppression preferences; do not use an old CSV to override them.

If an email fails, the admin row explains the configuration problem. Correct it and let the visitor submit the form again after the cooldown for a fresh link. There is no automatic email retry loop. Resend idempotency keys reduce duplicate confirmation sends for the same signup version. Email accepted means the provider accepted the request; inspect Resend's logs to confirm delivery and check spam.

If contact sync fails, correct key/segment/topic settings and click Sync contact beside the confirmed subscriber. Requests that succeed after a previous network uncertainty detect an existing contact before trying to create it again.

## Deploy to the existing project

Preserve your private configuration. From the extracted project:

npm ci
npx convex deploy --env-file .env.deploy-fiery
npm run build

Confirm the target is fiery-perch-583 before accepting deployment. The schema adds newsletterSubscribers/newsletterLimits and an optional product inStock field. It does not delete existing products, services or bookings. Generated Convex API types update during deploy.

Keep hosting VITE_CONVEX_URL=https://fiery-perch-583.convex.cloud and your existing Authorize.net public settings. Publish the newly built dist/ or push the updated source to the hosting build. Existing Vercel SPA rewrites handle /contact and /subscribe/confirm.

No additional seed command or privileged CLI internal-mutation invocation is required. The email provider is called by scheduled backend actions after visitor requests/confirmation.

## Verification and scope

Production build and backend type checks passed; 45 automated tests pass. Coverage includes legacy stock defaults, authenticated toggling, preserving stock across edits, server blocking of sold-out checkouts, newsletter consent, deduplication, expiry, sender configuration, signup throttling, confirmation email payloads, existing contact preferences, admin authorization, and mounted newsletter form feedback with mocked requests.

Browser checks verified contact layout at desktop and mobile widths, the rendered Google Map, absence of link arrows, visible sold-out badges, disabled purchase controls in quick view and restoring availability in a local fixture. Live browser signup submission was blocked by automatic approval review because it could create a subscriber/send email; the interaction was verified with a mocked mounted test instead. No real emails, contacts or production stock were changed.

The supplied ZIP did not contain the separate booking-alert integration previously discussed in chat. This update preserves its payment/appointment logic and adds newsletter emails only. $10 product shipping and shipping-free $50 appointment deposits remain intact.

References:
https://resend.com/docs/api-reference/emails/send-email
https://resend.com/docs/api-reference/contacts/create-contact
https://resend.com/docs/api-reference/contacts/get-contact
https://resend.com/docs/dashboard/domains/introduction
