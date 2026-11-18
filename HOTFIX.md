# Blank-page hotfix

The new root service provider previously used `useQuery`, which throws a Convex query error during React rendering. A failing `services:listPublic` query could therefore unmount the entire application. This patch uses Convex’s `useQueries` error-as-value behavior, keeps the rest of the site mounted and shows an appointment-unavailable message. No static catalogue is substituted on failure. The admin service section also handles its query failures locally.

Use the updated project archive, rebuild and publish the frontend. If copying only this patch, update `src/store/services.tsx`, add `shared/serviceLoadState.ts`, update `src/components/Visit.tsx` and `src/admin/ServicesAdmin.tsx`.

The frontend fix prevents the blank page. It does not resolve an underlying deployment/data problem on its own. Check the Convex Dashboard logs for `services:listPublic` and the request ID reported by the browser. Ensure the production frontend’s `VITE_CONVEX_URL` points to the same deployment receiving the current backend/schema. Deploy to that project with `npx convex deploy`; confirm the selected production deployment before publishing. Do not delete tables or reseed live data to work around a query error.

Build and 26 automated tests pass, including error/loading/recovery states. No live deployment was performed by this task.

## Live diagnosis

Read-only checks of https://www.calarybeauty.com/ confirmed its published frontend connects to `https://fiery-perch-583.convex.cloud`. `products:listPublic` succeeds with 20 products, while `services:listPublic` returns a server error (fresh request reference `f1652bb66e2f981d`). This confirms the failed service query causes the new root provider to crash; it does not reveal the underlying private server exception. Open that deployment's Convex Dashboard Logs and inspect the failing service query. The browser/request API intentionally hide the internal error text. Send the actual log exception to diagnose whether data, indexes or deployed code need correction.

## React #301 correction

The earlier error-handling patch created fresh query request objects for `useQueries` on every render. Convex's subscription hook detects changing request identity and schedules another render. On subsequent renders this could repeat indefinitely. Both the root service provider and the admin services view now use stable module-level request objects.

Mounted React tests explicitly reproduce the old error after a parent update, and pass with the corrected requests. The production build and all 31 tests pass. Publish the corrected frontend to install this fix. No backend/schema change is required specifically for React #301. The earlier live service server error remains a separate issue requiring the private Convex log; this patch handles that failure without unmounting the storefront.

## Appointments tab protection

The appointment list's paginated query could throw during rendering and unmount the entire dashboard. A section error boundary now isolates this failure, retains the dashboard tabs, displays the support request reference and offers retry. A mounted React test checks failure isolation and successful retry.

The backend normalizes historical payment payloads per appointment. Missing fields, null objects or malformed JSON no longer fail the entire page. Those records remain visible with a review label and their original checkout reference/deposit. No stored payment payloads are rewritten or deleted. This addresses a potential record-format failure, but the supplied browser error does not reveal whether it is the actual live server cause. The production Convex log for `appointments:list` request `a10b8bea7bf97401` is required to identify that cause; the separate `services:listPublic` error is also still reported by the live frontend.

Deploy the updated backend with `npx convex deploy` to the existing Calary production deployment, then publish the updated frontend. Preserve your environment settings. Production build, backend types and all 33 automated tests passed. No live deployment or access to private production logs was performed.
