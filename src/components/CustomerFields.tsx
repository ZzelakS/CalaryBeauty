import { useState } from 'react'
import { countryCodes, parseCustomer, type Address } from '../../shared/checkout'

export function readCustomer(form: FormData, collectShipping = true) {
  const read = (prefix: string): Address => Object.fromEntries(['firstName','lastName','company','address','address2','city','state','zip','country'].map(key => [key, String(form.get(`${prefix}.${key}`) || '').trim()])) as unknown as Address
  const billing = read('billing')
  return parseCustomer({ email:String(form.get('customerEmail') || ''), phone:String(form.get('customerPhone') || ''), billing, ...(collectShipping ? {shipping:form.get('sameAddress') ? billing : read('shipping')} : {}) }, collectShipping)
}
const countries = countryCodes.map(code => {
  const label = new Intl.DisplayNames(['en'],{type:'region'}).of(code) || code
  return {code,label}
}).sort((a,b)=>a.label.localeCompare(b.label))
function AddressFields({ prefix, disabled }: { prefix: string; disabled: boolean }) {
  const [country, setCountry] = useState('US')
  const fields = [
    ['firstName','First name',50,'given-name',true], ['lastName','Last name',50,'family-name',true],
    ['company','Company (optional)',50,'organization',false], ['address','Street address',60,'address-line1',true],
    ['address2','Apartment / suite (optional)',60,'address-line2',false], ['city','City',40,'address-level2',true],
    ['state',country === 'US' ? 'State code (e.g. MD)' : 'State / province / region',40,'address-level1',true], ['zip','Postal / ZIP code',20,'postal-code',true],
  ] as const
  return <div className="grid gap-4 sm:grid-cols-2">{fields.map(([key,label,max,autocomplete,required]) => <label key={key} className="text-sm">{label}<input className="booking-input" name={`${prefix}.${key}`} maxLength={max} autoComplete={`${prefix} ${autocomplete}`} required={required} disabled={disabled} pattern={key === 'state' && country === 'US' ? '[A-Za-z]{2}' : undefined} /></label>)}
    <label className="text-sm sm:col-span-2">Country<select className="booking-input" name={`${prefix}.country`} autoComplete={`${prefix} country`} value={country} disabled={disabled} onChange={event=>setCountry(event.target.value)}>{countries.map(item=><option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
    <p className="text-xs text-mocha sm:col-span-2">Street address and apartment combined must fit within 60 characters.</p>
  </div>
}
export function CustomerFields({ disabled, collectShipping = true }: { disabled: boolean; collectShipping?: boolean }) {
  const [same, setSame] = useState(true)
  return <div className="space-y-6">
    <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2"><legend className="display mb-4 text-2xl">Contact details</legend>
      <label className="text-sm">Email<input className="booking-input" name="customerEmail" type="email" autoComplete="email" maxLength={255} required /></label>
      <label className="text-sm">Phone<input className="booking-input" name="customerPhone" type="tel" autoComplete="tel" maxLength={25} required /></label>
    </fieldset>
    <fieldset><legend className="display mb-4 text-2xl">Billing address</legend><AddressFields prefix="billing" disabled={disabled} /></fieldset>
    {collectShipping && <label className="flex gap-3 text-sm"><input type="checkbox" name="sameAddress" checked={same} onChange={event=>setSame(event.target.checked)} disabled={disabled} />Shipping address is the same as billing</label>}
    {collectShipping && !same && <fieldset><legend className="display mb-4 text-2xl">Shipping address</legend><AddressFields prefix="shipping" disabled={disabled} /></fieldset>}
  </div>
}
