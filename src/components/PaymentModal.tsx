import {useEffect,useRef,useState,type FormEvent} from 'react'
import type {ResolvedLine} from '../store/cart'
import type {BookingDetails} from '../../shared/checkout'
import {useServices} from '../store/services'
import {serviceDeposit} from '../../shared/services'
import {PRODUCT_SHIPPING_FEE} from '../../shared/pricing'
import {AFFIRM_MIN_CENTS,AFFIRM_MAX_CENTS} from '../../shared/stripe'
import {formatPrice} from '../data/products'
import {affirmEnabled,startStripeCheckout,readPendingStripe,pendingStripeUrl} from '../lib/stripe'
import {CustomerFields,readCustomer} from './CustomerFields'
import {ShaderButton} from './ShaderButton'
import {Lightbox} from './Lightbox'
interface PaymentModalProps{open:boolean;lines?:ResolvedLine[];subtotal:number;booking?:BookingDetails;onClose:()=>void;onSuccess:(message:string)=>void}
export function PaymentModal({open,lines=[],subtotal,booking,onClose}:PaymentModalProps){
 const {services,extras}=useServices()
 const service=services.find(item=>item.id===booking?.serviceId)
 const amount=booking ? serviceDeposit(service):subtotal+PRODUCT_SHIPPING_FEE
 const serviceTotal=booking ? (service?.lengths.find(item=>item.name===booking.length)?.price || 0)+extras.filter(extra=>booking.extras.includes(extra.name)).reduce((sum,extra)=>sum+extra.price,0):0
 const [method,setMethod]=useState<'card'|'affirm'>('card'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[uncertain,setUncertain]=useState(false)
 const submitting=useRef(false),requestId=useRef('')
 const pending=readPendingStripe()
 useEffect(()=>{
  if(!open)return
  let previous='';try{previous=sessionStorage.getItem('calary.pendingPayment') || ''}catch{/* new checkout will require storage */}
  const stripe=readPendingStripe();previous=previous || stripe?.requestId || ''
  requestId.current=previous || crypto.randomUUID();setMethod('card');setBusy(false);submitting.current=false;setUncertain(Boolean(previous))
  setError(previous ? `An earlier checkout needs review. Check its status before paying again. Reference: ${previous}`:'')
 },[open])
 const submit=async(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();if(submitting.current || uncertain)return
  let customer
  try{customer=readCustomer(new FormData(event.currentTarget),!booking)}catch(error){setError(error instanceof Error ? error.message:'Check your contact and address details.');return}
  submitting.current=true;setBusy(true);setError('')
  try{
   const result=await startStripeCheckout(lines,customer,requestId.current,booking ? 'card':method,booking)
   if(result.ok)return
   setError(result.message);setUncertain(!result.retryable);if(result.retryable)requestId.current=crypto.randomUUID()
  }catch(error){setError(error instanceof Error ? error.message:'Checkout could not be opened.')}
  setBusy(false);submitting.current=false
 }
 return <Lightbox open={open} onClose={()=>{if(!busy)onClose()}} title={booking ? `Pay your ${formatPrice(amount)} appointment deposit`:'Complete your order'}><form onSubmit={submit} className="space-y-6"><div className="bg-sand/50 p-4 text-sm">
  {booking ? <><p className="display mb-3 text-xl">{service?.name} · {booking.length}</p><div className="mb-3 flex justify-between"><span>Service total</span><strong>{formatPrice(serviceTotal)}</strong></div></>:<><div className="mb-3 flex justify-between"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div><div className="mb-3 flex justify-between"><span>Shipping</span><strong>{formatPrice(PRODUCT_SHIPPING_FEE)}</strong></div></>}
  <div className="flex justify-between"><span>{booking ? 'Required deposit':'Order total'}</span><strong>{formatPrice(amount)}</strong></div>
  {booking ? <><p className="mt-3">Appointment: {booking.date} at {booking.time} (America/New_York). Your appointment is confirmed after successful payment. The deposit goes toward your service total. No shipping fee applies.</p><div className="mt-3 flex justify-between"><span>Balance at appointment</span><strong>{formatPrice(serviceTotal-amount)}</strong></div></>:<p className="mt-3 text-mocha">A flat $10 shipping fee applies to your product order. Review your delivery address on secure checkout.</p>}
 </div><CustomerFields disabled={busy || uncertain} collectShipping={!booking}/>
 {!booking && affirmEnabled && <fieldset disabled={busy || uncertain}><legend className="display mb-3 text-2xl">Payment method</legend><div className="flex flex-wrap gap-5"><label className="text-sm"><input type="radio" name="paymentMethod" checked={method==='card'} onChange={()=>{setMethod('card');setError('')}}/> Credit or debit card</label><label className="text-sm"><input type="radio" name="paymentMethod" checked={method==='affirm'} disabled={amount*100<AFFIRM_MIN_CENTS || amount*100>AFFIRM_MAX_CENTS} onChange={()=>{setMethod('affirm');setError('')}}/> Pay over time with Affirm</label></div><p className="mt-3 text-xs leading-6 text-mocha">Affirm is available for eligible US product orders from $35 to $30,000 including shipping. Approval and repayment terms are determined by Affirm.</p></fieldset>}
 {error && <p role="alert" className="border border-red-900/20 bg-red-50 p-4 text-sm text-red-900">{error}</p>}
 {pending && uncertain && <a href={pendingStripeUrl(pending)} className="block text-sm underline">Review pending Stripe checkout</a>}
 <ShaderButton full type="submit" disabled={busy || uncertain}>{busy ? 'Opening secure checkout…':method==='affirm' && !booking ? `Continue with Affirm · ${formatPrice(amount)}`:`Continue to secure payment · ${formatPrice(amount)}`}</ShaderButton>
 <p className="text-center text-xs leading-6 text-mocha">Secure checkout powered by Stripe. Enter your payment details on Stripe’s secure page. Supported wallets may appear there when available.</p>
 </form></Lightbox>
}
