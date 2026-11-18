# Booking hours, natural styles and deposits

## Behaviour

Appointments may start Monday–Friday from 9:30am through 7pm, Saturday from 9am through 7pm. Sundays are closed. All times are America/New_York (Windsor Mill / Eastern time, including daylight saving). Opening and 7pm are valid start times. These rules apply to appointment dates and times, not to the time of day a customer visits the website. Service durations were not supplied, so this update does not calculate end times or prevent overlapping appointments.

The form sets the time bounds for the selected day and disables time entry on Sunday. Both browser and payment backend validate the same rules before charging. Admin rescheduling uses those rules too. Existing paid appointments are preserved; staff can still update notes/status on an unchanged historical booking.

Two new appointment services (not shippable shop products):

| Service | Option | Total | Deposit | Balance |
| --- | --- | --- | --- | --- |
| Men’s cornrows | Cornrows · 4–6 straight backs | $50 | $20 | $30 |
| Men’s cornrows | Cornrows · 6–8 rows | $60 | $20 | $40 |
| Men’s cornrows | Cornrows with design | $70 | $20 | $50 |
| Natural twists | Men’s natural two-strand twists | $70 | $20 | $50 |
| Natural twists | Kids’ natural twists | $60 | $20 | $40 |

Extras add to the service total, not to the deposit. Existing services default to $50; historical payments keep the actual paid amount. Appointment shipping remains zero and shop shipping remains $10 per order. Card, Apple Pay and PayPal initiation all use the server-selected deposit; wallet availability still requires your existing provider configuration.

## Deploy and install the new services

1. Extract this ZIP, then restore your existing private environment files into its calary-beauty2 folder. Keep the real Fiery deployment key in .env.production.local.
2. In Terminal inside that folder:

```bash
npm ci
npx convex deploy --env-file .env.production.local
```

Confirm https://fiery-perch-583.convex.cloud before accepting. Do not proceed if a different deployment appears.
3. Keep VITE_CONVEX_URL=https://fiery-perch-583.convex.cloud in your frontend hosting settings. Push this source to your connected repository and redeploy the frontend. For manual hosting, run npm run build and upload dist/.
4. Sign in to Admin > Braiding services and click **Add men’s & kids’ styles**. This authenticated action adds the two missing services to an already-initialized catalogue. It is repeat-safe and preserves existing names, prices, photos, hidden state and extras. No privileged CLI seed command is required. Fresh catalogues already include both services.
5. Edit either service to add its photo or update its options. The **Booking deposit (applies to every option)** selector sets $20 or $50 explicitly. It defaults to $50 for new services; choose $20 for men’s/kids’ natural styles. It is not inferred from names or categories. The selected deposit appears beside each admin listing and throughout checkout. Option prices must cover that deposit.
6. Check a weekday 9:29am, Saturday 8:59am, Sunday, and any 7:01pm booking are rejected. Check weekday 9:30am, Saturday 9am and 7pm are accepted. Select each new option and verify the $20 deposit and balance before payment.

## Verification

Production build, frontend/backend type checks and automated tests pass. Tests cover hours boundaries, invalid dates, Eastern-time future checks, server rejection before contacting the gateway, every new option charging $20 with no shipping, admin installation permissions/idempotency, existing catalogue preservation, and configurable deposits.

No live deployment, seed, customer booking or payment was performed. Native browser preview was unavailable because the sandbox blocked the local listening port; automated checks were used instead. Existing source assets and features are retained. Private .env files and generated/dependency folders are intentionally omitted from this ZIP.
