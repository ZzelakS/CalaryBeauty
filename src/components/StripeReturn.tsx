import {useEffect,useRef,useState} from 'react'
import {Link} from 'react-router-dom'
import {useCart} from '../store/cart'
import {clearPendingStripe,readPendingStripe,stripeStatus,type StripeStatus} from '../lib/stripe'
import {stripeCheckoutUrl} from '../../shared/stripe'
import {formatPrice} from '../data/products'
export default function StripeReturn(){
 const [reference]=useState(()=>new URLSearchParams(window.location.search).get('reference') || '')
 const [token]=useState(()=>new URLSearchParams(window.location.hash.slice(1)).get('token') || (readPendingStripe()?.requestId===reference ? readPendingStripe()?.token:'') || (()=>{try{return sessionStorage.getItem(`calary.stripeReceiptToken.${reference}`) || ''}catch{return ''}})())
 const [result,setResult]=useState<StripeStatus|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const handled=useRef(false),alive=useRef(true)
 const {removePurchased}=useCart()
 const check=async(cancel=false)=>{
  if(!reference || !token){setMessage('This checkout link is incomplete. Contact the studio with your payment reference.');return}
  setBusy(true);setMessage('')
  try{
   const next=await stripeStatus({requestId:reference,token},cancel)
   if(!alive.current)return
   setResult(next)
   if(!next.ok){setMessage(next.message || 'We could not verify this payment. Please contact the studio.');return}
   if((next.status==='paid' || next.status==='expired') && !handled.current){
    handled.current=true
    if(next.status==='paid' && next.kind==='order'){
     const saved=readPendingStripe()
     if(saved?.requestId===reference)removePurchased(saved.items,reference)
    }
    if(next.status==='paid'){try{sessionStorage.setItem(`calary.stripeReceiptToken.${reference}`,token)}catch{/* receipt remains visible this visit */}}
    clearPendingStripe(reference)
    window.history.replaceState({},'',`/stripe-return?reference=${encodeURIComponent(reference)}`)
   }
  }catch{if(alive.current)setMessage('We could not verify this payment. Check again or contact the studio before paying again.')}
  finally{if(alive.current)setBusy(false)}
 }
 useEffect(()=>{alive.current=true;void check();return()=>{alive.current=false}},[])
 const paid=result?.ok && result.status==='paid',expired=result?.ok && result.status==='expired'
 return <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16"><p className="hud text-gold">Calary Beauty · Secure checkout</p><h1 className="display mt-5 text-4xl">{paid ? result.kind==='booking' ? 'Appointment booked.':'Your order is paid.':expired ? 'Checkout closed.':'Checking your payment.'}</h1><p role="status" className="mt-6 leading-7 text-mocha">{busy ? 'Verifying your order securely…':paid ? result.message || 'Thank you. Your payment has been received.':expired ? 'This checkout can no longer accept payment. Your bag is ready if you wish to start again.':result?.status==='open' ? 'Payment has not been completed. Resume this checkout or close it before starting another payment.':'Your payment is not yet confirmed. Check again before starting another checkout.'}</p>{typeof result?.amount==='number' && <p className="mt-4">{result?.kind==='booking' ? paid ? 'Deposit paid:':'Deposit:':'Order total:'} {formatPrice(result.amount)}</p>}<p className="mt-4 break-all text-sm">Reference: {reference || 'Unavailable'}</p>{paid && result.transactionId && <p className="mt-2 break-all text-sm">Receipt: {result.transactionId}</p>}{message && <p role="alert" className="mt-5 border border-red-900/20 p-4 text-sm">{message}</p>}<div className="mt-8 flex flex-wrap gap-4">{!paid && !expired && <><button disabled={busy} className="hud border border-gold px-5 py-3" onClick={()=>void check()}>Check payment status</button>{result?.ok && result.status==='open' && result.url && <><button disabled={busy} className="hud border border-gold px-5 py-3" onClick={()=>{try{window.location.assign(stripeCheckoutUrl(result.url))}catch{setMessage('The checkout address could not be verified.')}}}>Resume secure checkout</button><button disabled={busy} className="hud border px-5 py-3" onClick={()=>void check(true)}>Cancel this checkout</button></>}</>}<Link className="hud border border-ink/20 px-5 py-3" to="/">Return to the shop</Link></div></main>
}
