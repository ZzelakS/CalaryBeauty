# Calary Beauty — stock, newsletter and contact update

Start with OCT17-SETUP.md for deployment and email settings.

This is the complete modified source project based on the ZIP you supplied on October 17, 2026. It includes all public images, source files, package locks and tests. To keep the download lean, node_modules, generated dist builds, Git history, private environment files and temporary preview files are excluded.

1. Keep your current private environment files and hosting environment settings. Restore them locally into this extracted project if needed. They are not in this ZIP.
2. Run npm ci.
3. Configure newsletter email settings on the existing fiery-perch-583 Convex deployment as described in OCT17-SETUP.md.
4. Deploy the backend with npx convex deploy --env-file .env.deploy-fiery. Confirm fiery-perch-583. This key file must be copied privately from your existing setup; the archive does not contain it.
5. Build with npm run build using your existing frontend variables, including VITE_CONVEX_URL=https://fiery-perch-583.convex.cloud. Publish dist/ or push the updated source to your existing hosting build.
6. Verify /contact and Admin > Products / Subscribers. No database reseeding is needed.

The work was checked locally. No live deployment, real newsletter signup or email send was performed.
