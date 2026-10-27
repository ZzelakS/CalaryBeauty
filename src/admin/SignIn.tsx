import { useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'

/**
 * Email and password, via Convex Auth. Creating an account here does not grant
 * anything on its own — writes are gated by the ADMIN_EMAILS list held on the
 * Convex deployment, so the first sign-up is safe.
 */
export function SignIn() {
  const { signIn } = useAuthActions()
  const [flow, setFlow] = useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setError(null)

    if (!email.includes('@')) return setError('That does not look like an email address.')
    if (password.length < 8) return setError('Use at least eight characters.')

    setBusy(true)
    try {
      await signIn('password', { email, password, flow })
    } catch (failure) {
      const message = (failure as Error).message ?? ''
      setError(
        flow === 'signIn'
          ? 'That email and password do not match an account.'
          : message.includes('already')
            ? 'There is already an account with that address — sign in instead.'
            : 'Could not create that account. Check the address and try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="display text-4xl">{flow === 'signIn' ? 'Sign in' : 'Create your account'}</h1>
      <p className="mt-3 text-sm text-mocha">Studio accounts only.</p>

      <div className="mt-8 space-y-4">
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@calarybeauty.com"
          aria-label="Email"
          className="w-full border border-ink/20 bg-transparent px-3 py-2 text-sm focus:border-gold focus:outline-none"
        />
        <input
          type="password"
          autoComplete={flow === 'signIn' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void submit()
          }}
          placeholder="Password"
          aria-label="Password"
          className="w-full border border-ink/20 bg-transparent px-3 py-2 text-sm focus:border-gold focus:outline-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="hud w-full border border-gold bg-gold/10 py-3 transition-colors hover:bg-gold/20 disabled:opacity-50"
        >
          {busy ? 'Working…' : flow === 'signIn' ? 'Sign in' : 'Create account'}
        </button>

        <button
          type="button"
          onClick={() => {
            setFlow(flow === 'signIn' ? 'signUp' : 'signIn')
            setError(null)
          }}
          className="hud text-mocha hover:text-ink"
        >
          {flow === 'signIn' ? 'First time — create an account' : 'I already have an account'}
        </button>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </div>
    </div>
  )
}
