import { PRODUCT_SHIPPING_FEE } from '../../shared/pricing'
import { appleAvailable, paypalAvailable, payApple, payPaypal, type PaymentMethod } from '@/lib/wallets'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { ResolvedLine } from '@/store/cart'
import type { BookingDetails } from '../../shared/checkout'
import { useServices } from '@/store/services'
import { formatPrice } from '@/data/products'
import { startCheckout } from '@/lib/checkout'
import { CustomerFields, readCustomer } from './CustomerFields'
import { ShaderButton } from './ShaderButton'
import { Lightbox } from './Lightbox'

interface PaymentModalProps {
  open:boolean; lines?:ResolvedLine[]; subtotal:number; booking?:BookingDetails;
  onClose:()=>void; onSuccess:(message:string)=>void
}
interface AcceptResponse { messages:{resultCode:'Ok'|'Error';message?:{code:string;text:string}[]}; opaqueData?:{dataDescriptor:string;dataValue:string} }
declare global { interface Window { Accept?: { dispatchData:(data:{authData:{apiLoginID:string;clientKey:string};cardData:{cardNumber:string;month:string;year:string;cardCode:string;zip:string;fullName:string}},callback:(response:AcceptResponse)=>void)=>void } } }
const sandbox = import.meta.env.VITE_AUTHORIZENET_ENV === 'sandbox'
const scriptUrl = sandbox ? 'https://jstest.authorize.net/v1/Accept.js' : 'https://js.authorize.net/v1/Accept.js'
let scriptPromise:Promise<void> | undefined
function loadAccept() {
  if (window.Accept) return Promise.resolve()
  if (!scriptPromise) scriptPromise = new Promise<void>((resolve,reject)=>{
    const script = document.createElement('script');script.src=scriptUrl;script.async=true
    script.onload=()=>{if(window.Accept)resolve();else reject(new Error('Payment form could not initialize.'))}
    script.onerror=()=>{script.remove();scriptPromise=undefined;reject(new Error('Secure payment form could not load.'))}
    document.head.appendChild(script)
  })
  return scriptPromise
}
export function PaymentModal({open,lines=[],subtotal,booking,onClose,onSuccess}:PaymentModalProps) {
  const {services,extras}=useServices()
  const [loaded,setLoaded]=useState(false), [busy,setBusy]=useState(false), [error,setError]=useState(''), [uncertain,setUncertain]=useState(false)
  const [method,setMethod]=useState<PaymentMethod>('card')
  const submitting = useRef(false)
  const requestId = useRef('')
  const amount=booking ? 50 : subtotal + PRODUCT_SHIPPING_FEE
  const service = services.find(item => item.id === booking?.serviceId)
  const serviceTotal = booking ? (service?.lengths.find(item => item.name === booking.length)?.price || 0) + extras.filter(extra => booking.extras.includes(extra.name)).reduce((sum, extra) => sum + extra.price, 0) : 0
  useEffect(()=>{
    if(!open)return
    let pending = ''
    try { pending = sessionStorage.getItem('calary.pendingPayment') || '' } catch { /* in-memory protection remains */ }
    requestId.current=pending || crypto.randomUUID()
    setError(pending ? `A previous payment needs review. Contact the studio with reference ${pending} before trying again.` : '')
    setUncertain(Boolean(pending));setBusy(false);submitting.current=false
    let active=true
    loadAccept().then(()=>{if(active)setLoaded(true)}).catch(()=>{if(active)setError('Unable to load secure checkout. Please reload and try again.')})
    return ()=>{active=false}
  },[open])
  const submitPayment=(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault()
    if(submitting.current || uncertain)return
    if(method==='card' && (!window.Accept || !loaded)){setError('Secure checkout is still loading.');return}
    const apiLoginID=import.meta.env.VITE_AUTHORIZENET_API_LOGIN_ID, clientKey=import.meta.env.VITE_AUTHORIZENET_CLIENT_KEY
    if(method==='card' && (!apiLoginID || !clientKey)){setError('Payment service is not configured. Please contact Calary Beauty.');return}
    const form=event.currentTarget, data=new FormData(form)
    let customer
    try {customer=readCustomer(data, !booking)}catch(error){setError(error instanceof Error ? error.message : 'Check your address details.');return}
    if(method!=='card'){
      const popup=method==='paypal' ? window.open('about:blank','calary-paypal','width=600,height=750'):null
      submitting.current=true;setBusy(true);setError('')
      const beforeCharge=()=>{try{sessionStorage.setItem('calary.pendingPayment',requestId.current)}catch{}}
      const payment=method==='apple' ? payApple(lines,customer,requestId.current,amount,booking,beforeCharge):payPaypal(popup,lines,customer,requestId.current,booking,beforeCharge)
      payment.then(result=>{
        if(result.ok || result.retryable){try{sessionStorage.removeItem('calary.pendingPayment')}catch{}}
        setBusy(false);submitting.current=false
        if(result.ok){form.reset();onSuccess(`${result.message}${result.transactionId ? ` Receipt: ${result.transactionId}.`:''}`)}
        else{setError(result.message);setUncertain(!result.retryable);if(result.retryable)requestId.current=crypto.randomUUID()}
      }).catch(()=>{setBusy(false);submitting.current=false;setError('Unable to open the payment wallet. Please try again.');popup?.close()})
      return
    }
    const cardNumber=String(data.get('cardNumber')||'').replace(/\s/g,''), month=String(data.get('month')||''), year=String(data.get('year')||''), cardCode=String(data.get('cardCode')||''), fullName=String(data.get('cardholder')||'').trim()
    submitting.current=true;setBusy(true);setError('')
    try {window.Accept!.dispatchData({authData:{apiLoginID,clientKey},cardData:{cardNumber,month,year,cardCode,zip:customer.billing.zip,fullName}},async response=>{
      if(response.messages.resultCode!=='Ok' || !response.opaqueData){setError(response.messages.message?.[0]?.text || 'Please check your card details.');setBusy(false);submitting.current=false;return}
      // Remove raw card details as soon as the payment provider has tokenized them.
      for(const name of ['cardNumber','cardCode']){const input=form.elements.namedItem(name) as HTMLInputElement | null;if(input)input.value=''}
      try { sessionStorage.setItem('calary.pendingPayment', requestId.current) } catch { /* storage may be unavailable */ }
      const result=await startCheckout(lines,customer,response.opaqueData,requestId.current,booking)
      if(result.ok || result.retryable){try { sessionStorage.removeItem('calary.pendingPayment') } catch { /* storage may be unavailable */ }}
      if(!result.ok){setError(result.message);setUncertain(!result.retryable);if(result.retryable)requestId.current=crypto.randomUUID();setBusy(false);submitting.current=false;return}
      form.reset();setBusy(false);submitting.current=false
      onSuccess(`${result.message}${result.transactionId ? ` Receipt: ${result.transactionId}.` : ''}`)
    })} catch {setError('Unable to initialize payment. Please reload the page.');setBusy(false);submitting.current=false}
  }
  return <Lightbox open={open} onClose={()=>{if(!busy)onClose()}} title={booking ? 'Pay your $50 appointment deposit' : 'Complete your order'}>
    <form onSubmit={submitPayment} className="space-y-6">
      <div className="bg-sand/50 p-4 text-sm">
        {booking && <><p className="display mb-3 text-xl">{service?.name} · {booking.length}</p><div className="mb-3 flex justify-between"><span>Service total</span><strong>{formatPrice(serviceTotal)}</strong></div></>}
        {!booking && <><div className="mb-3 flex justify-between"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div><div className="mb-3 flex justify-between"><span>Shipping</span><strong>{formatPrice(PRODUCT_SHIPPING_FEE)}</strong></div></>}
        <div className="flex justify-between"><span>{booking ? 'Required deposit' : 'Order total'}</span><strong>{formatPrice(amount)}</strong></div>
        {booking ? <p className="mt-3">Your appointment is booked for {booking.date} at {booking.time} (America/New_York) after successful payment. The $50 deposit goes toward your service total.</p> : <p className="mt-3 text-mocha">A flat $10 shipping fee applies to every product order. Enter your delivery address below.</p>}
        {booking && <div className="mt-3 flex justify-between"><span>Balance at appointment</span><strong>{formatPrice(serviceTotal - 50)}</strong></div>}
      </div>
      <CustomerFields disabled={busy || uncertain} collectShipping={!booking} />
      {(appleAvailable() || paypalAvailable) && <fieldset disabled={busy || uncertain}><legend className="display mb-3 text-2xl">Payment method</legend><div className="flex flex-wrap gap-5">{(['card',...(appleAvailable() ? ['apple']:[]),...(paypalAvailable ? ['paypal']:[])] as PaymentMethod[]).map(option=><label key={option} className="text-sm"><input type="radio" name="paymentMethod" value={option} checked={method===option} onChange={()=>setMethod(option)} /> {option==='apple' ? 'Apple Pay':option==='paypal' ? 'PayPal':'Credit or debit card'}</label>)}</div></fieldset>}
      {method==='card' && <fieldset disabled={busy || !loaded || uncertain} className="space-y-4"><legend className="display mb-4 text-2xl">Card details</legend>
        <label className="block text-sm">Cardholder name<input name="cardholder" className="booking-input" autoComplete="cc-name" maxLength={64} required /></label>
        <label className="block text-sm">Card number<input name="cardNumber" className="booking-input" inputMode="numeric" autoComplete="cc-number" maxLength={19} pattern="[0-9 ]{13,19}" required /></label>
        <div className="grid grid-cols-3 gap-3"><label className="text-sm">Month (MM)<input name="month" className="booking-input" inputMode="numeric" autoComplete="cc-exp-month" pattern="0[1-9]|1[0-2]" maxLength={2} required /></label><label className="text-sm">Year (YY)<input name="year" className="booking-input" inputMode="numeric" autoComplete="cc-exp-year" pattern="[0-9]{2}" maxLength={2} required /></label><label className="text-sm">CVV<input name="cardCode" type="password" className="booking-input" inputMode="numeric" autoComplete="cc-csc" pattern="[0-9]{3,4}" maxLength={4} required /></label></div>
      </fieldset>}
      {error && <p role="alert" className="border border-red-900/20 bg-red-50 p-4 text-sm text-red-900">{error}</p>}
      <ShaderButton full type="submit" disabled={busy || (method==='card' && !loaded) || uncertain}>{busy ? 'Processing payment…' : method==='card' && !loaded ? 'Loading secure checkout…' : `${method==='paypal' ? 'Continue with PayPal · ':method==='apple' ? 'Apple Pay · ':'Pay '}${formatPrice(amount)}${booking ? ' deposit & book' : ''}`}</ShaderButton>
      <p className="text-center text-xs leading-relaxed text-mocha">Secure payment powered by Authorize.net. Your card details are tokenized by the payment provider. {sandbox ? 'Sandbox test mode.' : ''}</p>
    </form>
  </Lightbox>
}
