import { ServicesProvider } from './store/services'

import { Suspense, lazy, useCallback, useState, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
// import { Atelier } from '@/components/Atelier'
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
import { WhatsAppButton } from '@/components/WhatsAppButton'

// the dashboard is only ever needed at /admin — keep it out of the first load
import { Newsletter } from './components/Newsletter'
import { useCatalogue } from './store/catalogue'
const StripeReturn=lazy(()=>import('./components/StripeReturn'))
const ContactPage=lazy(()=>import('./components/ContactPage'))
const NewsletterConfirm=lazy(()=>import('./components/NewsletterConfirm'))
const AdminApp = lazy(() => import('@/admin/AdminApp'))

function Store({contact=false}:{contact?:boolean}) {
  const catalogue=useCatalogue()
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
      const current=catalogue.find(product.id)
      if(!current || current.inStock===false){setNotice('This product is out of stock or no longer available.');return}
      cart.add(product.id, length ?? product.lengths?.[1] ?? product.lengths?.[0])
      setNotice(`${product.name} is in your bag${length ? ` · ${length}` : ''}.`)
    },
    [cart,catalogue],
  )

  return (
    <>
      <Nav cartCount={cart.count} onOpenCart={() => setCartOpen(true)} />

      <main id="top">
        {contact ? <Suspense fallback={<p className="px-6 py-20">Loading contact details…</p>}><ContactPage/></Suspense> : <>
        <Hero />
        <Collection onOpen={open} onAdd={add} />
        <Fitting />
        {/* <Atelier /> */}
        <Visit onNotice={setNotice} />
        </>}
        <Newsletter/>
      </main>

      <Footer />

      <QuickView
        product={viewing ? catalogue.find(viewing.id) ?? {...viewing,inStock:false}:null}
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onAdd={add}
      />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} onNotice={setNotice} />
      <Notice message={notice} onDismiss={() => setNotice(null)} />
      <WhatsAppButton />
    </>
  )
}

function RouteScroll(){const {pathname,hash}=useLocation();useEffect(()=>{const timer=window.setTimeout(()=>{if(hash)document.getElementById(hash.slice(1))?.scrollIntoView();else window.scrollTo({top:0})},0);return()=>clearTimeout(timer)},[pathname,hash]);return null}
function Routed() {
  return (
    <BrowserRouter>
      <RouteScroll/>
      <ServicesProvider><CatalogueProvider>
        <CartProvider>
          <Routes>
              <Route path="/stripe-return" element={<Suspense fallback={<p className="p-10">Checking payment…</p>}><StripeReturn/></Suspense>} />

            <Route path="/" element={<Store />} />
            <Route path="/contact" element={<Store contact />} />
            <Route path="/subscribe/confirm" element={<Suspense fallback={<p className="p-10">Loading…</p>}><NewsletterConfirm/></Suspense>} />
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
      </CatalogueProvider></ServicesProvider>
    </BrowserRouter>
  )
}

export function App() {
  // Studio editing and the live product catalogue require a connected deployment.
  if (!isConvexConfigured || !convex) return <Routed />
  return (
    <ConvexAuthProvider client={convex}>
      <Routed />
    </ConvexAuthProvider>
  )
}
