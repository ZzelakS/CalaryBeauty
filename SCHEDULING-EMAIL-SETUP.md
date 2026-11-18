# Scheduling, pickup and Resend setup

## What is included

- Every service defaults to **4 hours** until its duration is changed in Dashboard → Braiding services.
- Dashboard → Braiding services also controls the studio-wide post-appointment buffer (default: **60 minutes**).
- Dashboard → Calendar displays paid bookings and live checkout holds. It can also block personal or unavailable time.
- A booking must fit inside the listed studio hours, service duration and buffer. The backend holds the time while Stripe Checkout is open, then turns it into a booking only after payment succeeds.
- Product checkout offers delivery ($10) or free pickup at **31 Mountain Green Cir, Windsor Mill, MD 21244**. Pickup does not request a delivery address. Affirm stays delivery-only because it requires a shipping address.
- Newsletter double opt-in remains in place. Appointment confirmation uses Resend: the client receives a Confirm / Can't make it link, and the studio receives payment and client-response emails.

## Convex environment variables

Set these on the production Convex deployment:

```bash
npx convex env set BOOKING_EMAIL_ENABLED true --prod
npx convex env set BOOKING_ALERT_TO calarybeautystore@gmail.com --prod
npx convex env set BOOKING_ALERT_FROM 'Calary Beauty <contact@calarybeauty.com>' --prod
npx convex env set RESEND_BOOKING_API_KEY re_xxxxxxxxx --prod
```

`contact@calarybeauty.com` must use a domain verified in Resend. Set `NEWSLETTER_ENABLED=true`, `NEWSLETTER_FROM='Calary Beauty <contact@calarybeauty.com>'`, and `RESEND_NEWSLETTER_API_KEY` to start the double-opt-in subscription flow. `SITE_URL` must already be the live website address so confirmation links point to the correct site.

## Deploy

```bash
npx convex deploy --prod
npm run build
```

Then deploy the frontend normally. No secret Resend or Stripe value belongs in Vercel / frontend variables.
