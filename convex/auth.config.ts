export default {
  providers: [
    {
      // set automatically by `npx @convex-dev/auth`
      domain: process.env.CONVEX_SITE_URL,
      applicationID: 'convex',
    },
  ],
}
