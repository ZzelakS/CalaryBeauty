import { Suspense, lazy, useCallback, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Atelier } from '@/components/Atelier'
import { CartDrawer } from '@/components/CartDrawer'
import { Collection } from '@/components/Collection'
import { Fitting } from '@/components/Fitting'
import { Footer } from '@/components/Footer'
import { Hero } from '@/components/Hero'
import { Nav } from '@/components/Nav'
import { Notice } from '@/components/Notice'
import { QuickView } from '@/components/QuickView'
import { Visit } from '@/components/Visit'
import type { Product } from '@/data/products'
import { CartProvider, useCart } from '@/store/cart'
import { CatalogueProvider } from '@/store/catalogue'
import { convex, isConvexConfigured } from '@/lib/convex'
import { ConvexAuthProvider } from '@convex-dev/auth/react'

// the dashboard is only ever needed at /admin — keep it out of the first load
const AdminApp = lazy(() => import('@/admin/AdminApp'))

function Store() {
  const cart = useCart()
  const [cartOpen, setCartOpen] = useState(false)
  const [viewing, setViewing] = useState<Product | null>(null)
  const [quickOpen, setQuickOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const open = useCallback((product: Product) => {
    setViewing(product)
    setQuickOpen(true)
  }, [])

  const add = useCallback(
    (product: Product, length?: string) => {
      cart.add(product.id, length ?? product.lengths?.[1] ?? product.lengths?.[0])
      setNotice(`${product.name} is in your bag${length ? ` · ${length}` : ''}.`)
    },
    [cart],
  )

  return (
    <>
      <Nav cartCount={cart.count} onOpenCart={() => setCartOpen(true)} />

      <main>
        <Hero />
        <Collection onOpen={open} onAdd={add} />
        <Fitting />
        <Atelier />
        <Visit onNotice={setNotice} />
      </main>

      <Footer />

      <QuickView
        product={viewing}
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onAdd={add}
      />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} onNotice={setNotice} />
      <Notice message={notice} onDismiss={() => setNotice(null)} />
    </>
  )
}

function Routed() {
  return (
    <BrowserRouter>
      <CatalogueProvider>
        <CartProvider>
          <Routes>
            <Route path="/" element={<Store />} />
            <Route
              path="/admin"
              element={
                <Suspense
                  fallback={
                    <div className="flex min-h-screen items-center justify-center">
                      <p className="hud text-mocha">Loading the dashboard…</p>
                    </div>
                  }
                >
                  <AdminApp />
                </Suspense>
              }
            />
            <Route path="*" element={<Store />} />
          </Routes>
        </CartProvider>
      </CatalogueProvider>
    </BrowserRouter>
  )
}

export function App() {
  // Without a deployment the site still runs, just on the bundled catalogue
  if (!isConvexConfigured || !convex) return <Routed />
  return (
    <ConvexAuthProvider client={convex}>
      <Routed />
    </ConvexAuthProvider>
  )
}
