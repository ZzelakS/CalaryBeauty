# Calary Beauty

Ecommerce front end for Calary Beauty — a Baltimore hair studio selling custom
single-donor units, installs, lashes and gloss.

Built around a Three.js hero: a branch is surveyed into existence in wireframe,
materialises in gold, and the butterfly from the logo flies in to perch on it —
then bolts when you reach for it.

Vite · React 18 · TypeScript (strict) · Tailwind CSS · Three.js 0.170 · Convex

## Running it

```bash
npm install
npm run dev          # http://localhost:5173
npm run dev:backend  # convex dev, in a second terminal
npm run build        # tsc --noEmit && vite build
npm run preview      # serve the production build
```

The frontend is a static build — Vercel or Netlify, with the SPA rewrite already
in `vercel.json` / `public/_redirects`. The backend deploys separately with
`npx convex deploy`.

## The design

Light and warm, not dark. The logo was drawn gold-on-black, so the palette runs
the gold across a cream page and saves black for one band at the very bottom,
where the logo gets to sit the way it was designed.

| Token | Value | Used for |
| --- | --- | --- |
| `porcelain` | `#FBF6EF` | page background — warm, never white |
| `linen` | `#F4EADC` | card plates, raised surfaces |
| `sand` | `#EADCC6` | the install band |
| `ink` | `#2C1F16` | body text, hairlines |
| `mocha` | `#6B5340` | secondary text |
| `gold` | `#C08A34` | prices, CTAs, nav underlines — sampled from the logo |
| `honey` | `#E8B45C` | the logo's highlight gold |
| `signal` | `#A9701F` | scan / survey instrument colour |
| `noir` | `#1A1511` | the footer band |

Type: Bodoni Moda (display, closest to the logo wordmark), Karla (body), Space
Mono (HUD readouts, prices, labels). All three are **self-hosted** through
Fontsource — no Google Fonts request, nothing render-blocking, and the page
looks right offline or behind a strict CSP. Imports live in `src/fonts.ts`.

The primary control is a near-black chip carrying a live liquid-metal shader:
domain-warped noise read through a repeating ramp, so the hard ramp edges become
veins that look poured rather than painted. The metal is quietened in a
horizontal lane behind the label so the words stay legible while it moves. The
secondary control stays a plain outline — two competing metal buttons in one
row would be noise.

## Brand assets

`public/brand/` holds transparent PNGs cut from the supplied logo:

| File | Use |
| --- | --- |
| `calary-logo-ink.png` | full lockup, deepened gold — for cream surfaces |
| `calary-logo-gold.png` | full lockup, bright gold — for the noir footer |
| `calary-mark-ink/gold.png` | face + butterfly, no wordmark |
| `calary-butterfly-ink/gold.png` | butterfly only — the nav icon and favicon |

The butterfly-only crop exists because the face line art disappears below about
60px; use it anywhere small. If you have vector artwork, swap these for SVG.

## Structure

```
convex/                         backend — see "Database and dashboard" below
src/
├── admin/
│   ├── AdminApp.tsx            dashboard shell, table, CRUD wiring
│   ├── ProductForm.tsx         create/edit, fields switch on product type
│   ├── ImageField.tsx          ImageKit upload with drag/drop and progress
│   └── SignIn.tsx              email/password, with first-run account creation
├── lib/
│   ├── convex.ts               client, site URL, product mapping
│   └── imagekit.ts             upload and `tr=` sizing
├── store/
│   ├── catalogue.tsx           live Convex query, seed fallback
│   └── cart.tsx                cart context, resolves against the catalogue
├── three/
│   ├── HeroScene.ts            intro timeline, parallax, raycast, lifecycle
│   ├── branch.ts               procedural branch — seeded growth, tapered tubes
│   ├── butterfly.ts            wing shader + approach/perch/flee/return
│   ├── particles.ts            pointer trail and ambient dust
│   └── shaders/branchShaders.ts  wireframe scan pass and materialising surface
├── components/
│   ├── Hero.tsx                mounts the scene, drives the scan readout
│   ├── ShaderButton.tsx        GLSL button, lazy WebGL context
│   ├── ScanImage.tsx           image revealed under a scan line
│   ├── Nav.tsx  Drawer.tsx  Collection.tsx  ProductCard.tsx
│   ├── QuickView.tsx  CartDrawer.tsx  Fitting.tsx  Atelier.tsx  Visit.tsx
│   └── Footer.tsx  Notice.tsx
├── store/cart.tsx              cart context, reducer, localStorage
├── data/products.ts            the catalogue
└── lib/checkout.ts             payment stub — see below
```

Section ids kept from the build: `#collection` (Shop), `#fitting` (The install),
`#atelier` (Studio), `#visit` (Book).

## How the hero works

| Time | What happens |
| --- | --- |
| 0.3s | scan front starts travelling out from the base of the trunk |
| 1.05s | the solid branch begins materialising behind the front |
| 2.4s | scan reaches the last twig, readout hits 100% |
| ~3.0s | wireframe drops to a faint ghost, headline rises, butterfly released |

Both passes measure distance from the same origin, so the wireframe stays one
step ahead of the surface. A slow survey pulse keeps looping afterwards.

The hero is composed in layers rather than as a headline over a backdrop: type
on the left, and on the right a floating card and two readouts sitting over the
scene where the branch thins out. That right rail is hidden below `lg`, where it
would fight the branch for the same space.

Note: do **not** put `backdrop-filter` on anything overlaying the hero canvas.
It forces a full recomposite every frame and drags the intro from three seconds
to twenty. Use an opaque background and a shadow instead.

The bark is procedural: noise stretched hard along each limb so it reads as
fibre running with the grain, a coarser layer for the plates, and occasional
knots. There is no normal map — the surface shader samples the height either
side of the fragment and tilts the lighting from the difference. Turn it down or
off with the `uBark` uniform in `HeroScene.ts`.

Timings are constants at the top of `HeroScene.ts`. The branch shape comes from
`buildBranch(seed)` — the seed is fixed so it looks the same on every visit.
The butterfly startles when the pointer ray passes within 0.5 world units, and
only perches on tips right of centre so it never lands on the headline.

`prefers-reduced-motion` skips the intro, disables particles and keeps the
butterfly still.

## Swapping in real photography

Drop images into `public/products/` using the existing filenames: `monarch.jpg`,
`wing.jpg`, `silk.jpg`, `bloom.jpg`, `ripple.jpg`, `flutter.jpg`, `nectar.jpg`,
`root.jpg`, plus `studio-1.jpg` and `studio-2.jpg`. Portrait, roughly 900×1200.
The current files are generated placeholders in the brand golds.

Product names, prices, specs and copy are all in `src/data/products.ts`.

## Database and dashboard

Products live in **Convex** and are edited at **`/admin`**. Images go to
ImageKit. Convex covers the database, the auth, and the ImageKit signing
endpoint, so there is no separate serverless function to deploy.

Neither is required to run the site: with no `VITE_CONVEX_URL`, the shop serves
the catalogue bundled in `src/data/products.ts` and `/admin` shows the setup
steps instead of the dashboard.

### Setup

```bash
npx convex dev            # creates the project, writes VITE_CONVEX_URL to .env.local
npx @convex-dev/auth      # sets the auth keys on the deployment
npx convex env set ADMIN_EMAILS "you@calarybeauty.com"
npx convex env set IMAGEKIT_PRIVATE_KEY private_xxxxxxxx
```

Then run the two processes side by side — `npm run dev:backend` in one terminal
and `npm run dev` in the other. Convex pushes function changes on save.

### Getting to the dashboard

There is no prominent admin button — a shop should not advertise its back door.
Two ways in:

- **Studio login** in the footer, always there but quiet.
- A **Dashboard** pill in the nav, which appears only once an admin is signed
  in, so you can get back without typing the URL.

`/admin` is a normal route, so a bookmark works too.

Open `/admin`, choose **First time — create an account**, and sign in. Creating
an account grants nothing on its own: every write checks the signed-in email
against `ADMIN_EMAILS`, which lives on the deployment and cannot be edited from
a browser. With no allowlist set, all writes are refused.

Press **Load starter catalogue** to write the eight bundled products, then
create, edit and delete from the table. Convex is reactive, so a save shows up
in an open storefront tab without a refresh.

### ImageKit

Put the **public** key and URL endpoint in `.env` as `VITE_IMAGEKIT_*`. The
private key goes on the deployment (`npx convex env set IMAGEKIT_PRIVATE_KEY`),
never in a `VITE_` variable — those are compiled into the client bundle.

The `imagekit-auth` HTTP action signs a ten-minute upload token, and the browser
posts the file straight to ImageKit. It is served from `.convex.site` rather
than `.convex.cloud`; `convexSiteUrl()` handles that. Deleting a product — or
replacing its image — schedules an action that removes the orphaned file.

For production, tighten the upload CORS from `*` to your domain:

```bash
npx convex env set SITE_URL "https://calarybeauty.com"
```

### Backend layout

```
convex/
├── schema.ts        products table + indexes, and the Convex Auth tables
├── auth.ts          email/password provider
├── auth.config.ts   JWT config, filled in by `npx @convex-dev/auth`
├── products.ts      listPublic / listAll / viewer / save / remove / seedMany
├── imagekit.ts      upload-token HTTP action + scheduled file cleanup
├── http.ts          routes: /api/auth/* and /imagekit-auth
└── _generated/      regenerated by `npx convex dev` — safe to delete
```

`_generated/` is committed so the project typechecks before you have run the CLI
once. It is overwritten on your first `npx convex dev`.

### Data shape

`products` — one document per product, keyed on `slug`.

| Field | Type | Notes |
| --- | --- | --- |
| `slug` | string | url-safe id from the name, stable once created |
| `name` `tag` `subtitle` | string | tag is the small label beside the name |
| `price` | number | USD, whole dollars |
| `category` | `"wigs"` \| `"beauty"` | drives the filter and the form |
| `image` | string | absolute ImageKit URL, or a path in /public |
| `imageFileId` | string? | ImageKit id, used for cleanup |
| `origin` `detail` | string | quick view copy |
| `specs` | array | `{ label, value }` |
| `lengths` | array? | wigs only — becomes the size picker |
| `active` | boolean | false keeps it out of the shop |
| `order` | number | low numbers first |

Indexes: `by_slug` for lookups, `by_active` for the storefront query.

## Connecting payment

`src/lib/checkout.ts` is a documented stub. Prices are USD, so Stripe Checkout
is the shortest path: create the session on your server, redirect to the URL it
returns. The subtotal is already converted to cents. Keep the secret key on the
server.

## Things to change before launch

- Booking email in `src/components/Visit.tsx` — currently `hello@calarybeauty.com`
- The studio address line, hours, shipping and returns in the same file
- Product prices and specs — either in `src/data/products.ts` or from `/admin`
  once Convex is connected (the current ones are placeholders, not quoted)
- The build credit in `src/components/Footer.tsx`

## Performance

Three.js is dynamically imported and the dashboard is a lazy route, so the
storefront loads neither until it needs them. Initial bundle ~92 kB gzipped
(Convex's reactive client is part of that), scene chunk ~134 kB after first
paint. Rendering pauses when the tab is hidden or
the hero scrolls out of view. Shader buttons create a WebGL context on hover and
dispose it 1.4s after the pointer leaves; coarse pointers get a CSS fallback.

Verified in headless Chromium (SwiftShader) at 1440px, 834px and 390px, with
reduced motion on and off: no console errors, no shader compile failures, clean
keyboard order through nav, drawers and cart.
