import {usePaginatedQuery} from 'convex/react'
import {api} from '../../convex/_generated/api'
import {formatPrice} from '../data/products'
import {SectionErrorBoundary} from './SectionErrorBoundary'
function address(value:unknown):string{
 if(!value || typeof value!=='object')return ''
 const a=value as Record<string,unknown>
 return ['line1','line2','address','address2','city','state','postal_code','zip','country'].map(key=>typeof a[key]==='string' ? a[key]:'').filter(Boolean).join(', ')
}
function OrderDetails({payload}:{payload:string}){
 const p=JSON.parse(payload),customer=p.customer || {},shipping=p.stripeShippingDetails,billing=p.stripeCustomerDetails
 return <div className="mt-4 space-y-2 text-sm"><p>{billing?.name || [customer.billing?.firstName,customer.billing?.lastName].filter(Boolean).join(' ')} · {billing?.email || customer.email} · {billing?.phone || customer.phone}</p><p><strong>Ship to:</strong> {shipping ? `${shipping.name} · ${address(shipping.address)}` : `${[customer.shipping?.firstName,customer.shipping?.lastName].filter(Boolean).join(' ')} · ${address(customer.shipping)}`}</p><p><strong>Billing:</strong> {address(billing?.address || customer.billing)}</p>{Array.isArray(p.items) && <ul className="space-y-1">{p.items.filter((item:unknown)=>item && typeof item==='object').map((item:Record<string,unknown>,index:number)=><li key={index}>{String(item.quantity)} × {String(item.name || item.productId || 'Product')}{item.length ? ` · ${String(item.length)}`:''}{typeof item.unitPrice==='number' ? ` · ${formatPrice(item.unitPrice)} each`:''}</li>)}</ul>}<p>Shipping: {formatPrice(typeof p.shippingAmount==='number' ? p.shippingAmount:0)}</p></div>
}
function Orders(){
 const {results,status,loadMore}=usePaginatedQuery(api.orders.list,{}, {initialNumItems:25})
 return <section><h1 className="display text-4xl">Product orders</h1><p className="mt-3 text-sm text-mocha">Stripe product payments and historical orders. Fulfil only paid orders. Refund Affirm payments in Stripe; refunds are shown after the refund webhook arrives. Disputes must be monitored in Stripe.</p>{results.map(order=><article key={order.id} className="mt-5 border border-ink/20 p-5"><div className="flex flex-wrap justify-between gap-3"><h2 className="display text-2xl">{formatPrice(order.amount)} · {order.status}</h2><span className="hud">{order.provider==='stripe' ? 'Stripe':'Legacy payment'}</span></div>{order.refundedAmount>0 && <p className="mt-3 font-semibold">Refunded: {formatPrice(order.refundedAmount)} — review before fulfilment</p>}<p className="mt-3 break-all text-xs">Reference: {order.reference}</p>{order.transactionId && <p className="mt-2 break-all text-xs">Payment: {order.transactionId}</p>}<OrderDetails payload={order.payload}/></article>)}{status==='LoadingFirstPage' && <p className="mt-6">Loading orders…</p>}{status==='Exhausted' && !results.length && <p className="mt-6">No product orders yet.</p>}{status==='CanLoadMore' && <button className="mt-6 border px-5 py-3" onClick={()=>loadMore(25)}>Load more</button>}</section>
}
export function OrdersAdmin(){return <SectionErrorBoundary name="Product orders"><Orders/></SectionErrorBoundary>}
