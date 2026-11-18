import { Password } from '@convex-dev/auth/providers/Password'
import { convexAuth } from '@convex-dev/auth/server'

/**
 * Email + password accounts for the studio dashboard.
 *
 * Signing up only creates an account. Whether that account may write anything
 * is decided separately by the ADMIN_EMAILS allowlist — see `requireAdmin` in
 * products.ts.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
})
