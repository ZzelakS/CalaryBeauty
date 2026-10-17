# Update notes

- The sticky navbar occupies its own space, so desktop and mobile hero images begin below it.
- Mobile product grids use two columns, with compact card typography and buttons.
- In the admin product form, use “Add another photo” for additional uploads or image URLs. The primary photo remains first.
- Product cards cycle through photos every 3 seconds. Product popups support swiping, horizontal scrolling, arrow buttons, keyboard arrows, and thumbnail selection.
- Convex now stores an optional `images` array. Existing products remain compatible; no data migration is required.
- Convex save/delete mutations clean up removed gallery files in ImageKit as well as primary files.

- Wigs is the first and default collection filter; Everything also lists wigs first.

## Apply to your hosted app

From the project folder, install dependencies with `npm ci`.
Deploy the backend schema and functions with `npx convex deploy`, selecting the intended production deployment. For a development deployment, use `npx convex dev`.
Then build/deploy the frontend through your existing Vercel workflow (`npm run build`). Deploy Convex first so the backend accepts the new gallery field.

The hosted Convex deployment and frontend were not changed during this task. TypeScript checks and the production build passed locally. Browser and live admin upload testing were not performed.

The archive excludes dependency folders, Git metadata, deployment metadata, and environment files containing credentials. Keep your existing environment configuration when applying these source files.
