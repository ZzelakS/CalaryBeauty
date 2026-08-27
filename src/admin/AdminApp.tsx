import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuthActions } from '@convex-dev/auth/react'
import { Authenticated, Unauthenticated, useConvexAuth, useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { categories, formatPrice, seedProducts, type Product } from '@/data/products'
import { isConvexConfigured, toConvexProduct } from '@/lib/convex'
import { imageUrl, isImageKitConfigured } from '@/lib/imagekit'
import { ProductForm } from './ProductForm'
import { SignIn } from './SignIn'

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-porcelain">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-3">
            <img src="/brand/calary-butterfly-ink.png" alt="" className="h-7 w-auto" />
            <span className="display text-xl">
              Calary <span className="text-gold">Beauty</span>
            </span>
            <span className="hud ml-2 text-mocha">Dashboard</span>
          </Link>
          <Link to="/" className="hud text-mocha hover:text-ink">
            View the shop
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-6 py-12">{children}</main>
    </div>
  )
}

function SetupNotice() {
  return (
    <Shell>
      <h1 className="display text-4xl">The dashboard needs a Convex deployment</h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-mocha">
        The shop is running on the catalogue bundled with the build. To edit products from here,
        connect a Convex deployment. Full steps are in the README.
      </p>

      <ol className="mt-8 max-w-2xl space-y-4 border-t border-ink/10 pt-8">
        {[
          'Run: npx convex dev — it creates the project and writes VITE_CONVEX_URL into .env.local.',
          'Run: npx @convex-dev/auth — this sets the auth keys on the deployment.',
          'Run: npx convex env set ADMIN_EMAILS "you@calarybeauty.com"',
          'Optionally: npx convex env set IMAGEKIT_PRIVATE_KEY private_xxx',
          'Reload this page, create your account, then load the starter catalogue.',
        ].map((step, index) => (
          <li key={step} className="flex gap-4">
            <span className="hud w-8 flex-none text-gold">{`0${index + 1}`}</span>
            <span className="font-mono text-xs leading-relaxed text-ink">{step}</span>
          </li>
        ))}
      </ol>
    </Shell>
  )
}

function Dashboard() {
  const { signOut } = useAuthActions()
  const viewer = useQuery(api.products.viewer)
  const products = (useQuery(api.products.listAll) ?? []) as Product[]
  const save = useMutation(api.products.save)
  const remove = useMutation(api.products.remove)
  const seedMany = useMutation(api.products.seedMany)

  const [editing, setEditing] = useState<Product | null>(null)
  const [creating, setCreating] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const ids = useMemo(() => products.map((product) => product.id), [products])

  if (viewer === undefined) {
    return (
      <Shell>
        <p className="hud text-mocha">Loading…</p>
      </Shell>
    )
  }

  if (!viewer?.isAdmin) {
    return (
      <Shell>
        <h1 className="display text-4xl">Not a studio account</h1>
        <p className="mt-4 max-w-xl text-sm text-mocha">
          {viewer?.email ?? 'This account'} is signed in but cannot edit products.
          {viewer?.allowlistConfigured
            ? ' Ask whoever runs the deployment to add this address.'
            : ' No admin list has been set yet — run: npx convex env set ADMIN_EMAILS "you@example.com"'}
        </p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="hud mt-6 border border-ink/25 px-5 py-3 hover:border-gold"
        >
          Sign out
        </button>
      </Shell>
    )
  }

  const handleSave = async (product: Product) => {
    await save(toConvexProduct(product))
    setStatus(`${product.name} saved.`)
    setEditing(null)
    setCreating(false)
  }

  const handleDelete = async (product: Product) => {
    const confirmed = window.confirm(
      `Delete ${product.name}? This removes it from the shop immediately and cannot be undone.`,
    )
    if (!confirmed) return

    setBusy(true)
    try {
      await remove({ slug: product.id })
      setStatus(`${product.name} deleted.`)
    } catch (failure) {
      setStatus((failure as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const handleSeed = async () => {
    setBusy(true)
    try {
      const written = await seedMany({ products: seedProducts.map(toConvexProduct) })
      setStatus(`${written} starter product${written === 1 ? '' : 's'} written.`)
    } catch (failure) {
      setStatus((failure as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-4xl">Products</h1>
          <p className="mt-2 text-sm text-mocha">
            {products.length} item{products.length === 1 ? '' : 's'} · live from Convex
            {isImageKitConfigured ? '' : ' · ImageKit off'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {products.length === 0 ? (
            <button
              type="button"
              onClick={handleSeed}
              disabled={busy}
              className="hud border border-ink/25 px-5 py-3 transition-colors hover:border-gold disabled:opacity-50"
            >
              Load starter catalogue
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setCreating(true)
            }}
            className="hud border border-gold bg-gold/10 px-5 py-3 transition-colors hover:bg-gold/20"
          >
            New product
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="hud text-mocha hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </div>

      {status ? <p className="mt-6 text-sm text-mocha">{status}</p> : null}

      {creating || editing ? (
        <div className="mt-10">
          <ProductForm
            product={editing}
            existingIds={ids}
            onCancel={() => {
              setEditing(null)
              setCreating(false)
            }}
            onSave={handleSave}
          />
        </div>
      ) : null}

      {products.length === 0 ? (
        <p className="mt-10 text-sm text-mocha">
          Nothing here yet. Load the starter catalogue, or create a product from scratch.
        </p>
      ) : (
        <div className="mt-10 overflow-x-auto border border-ink/10">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-ink/10 bg-linen/70">
                {['', 'Product', 'Type', 'Price', 'Status', ''].map((heading, index) => (
                  <th key={index} className="hud px-4 py-3 text-mocha">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-ink/10 last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="h-16 w-12 overflow-hidden bg-linen">
                      {product.image ? (
                        <img
                          src={imageUrl(product.image, 96, 128)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="display text-xl">{product.name}</p>
                    <p className="text-xs text-mocha">{product.subtitle}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-ink">
                    {categories.find((category) => category.id === product.category)?.label}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gold">
                    {formatPrice(product.price)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`hud ${product.active ? 'text-ink' : 'text-mocha/70'}`}>
                      {product.active ? 'Live' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setCreating(false)
                        setEditing(product)
                        window.scrollTo({ top: 0 })
                      }}
                      className="hud mr-4 text-mocha hover:text-ink"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(product)}
                      disabled={busy}
                      className="hud text-mocha hover:text-red-700 disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  )
}

function Gate() {
  const { isLoading } = useConvexAuth()
  if (isLoading) {
    return (
      <Shell>
        <p className="hud text-mocha">Checking your session…</p>
      </Shell>
    )
  }
  return (
    <>
      <Unauthenticated>
        <Shell>
          <SignIn />
        </Shell>
      </Unauthenticated>
      <Authenticated>
        <Dashboard />
      </Authenticated>
    </>
  )
}

export default function AdminApp() {
  if (!isConvexConfigured) return <SetupNotice />
  return <Gate />
}
