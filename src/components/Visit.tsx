import { ImageViewer } from './ImageViewer'
import { useServices } from '@/store/services'
import { useState, type FormEvent } from 'react'
import { serviceDeposit, type Service } from '@/data/services'
import type { BookingDetails } from '../../shared/checkout'
import { BOOKING_HOURS, bookingHours } from '../../shared/bookingHours'
import { validateBooking } from '../../shared/booking'
import { PaymentModal } from './PaymentModal'
import { policyText } from '@/data/policies'
import { Policies } from './Policies'
import { Lightbox } from './Lightbox'
import { ShaderButton } from './ShaderButton'

interface VisitProps { onNotice: (message: string) => void }
const money = (value: number) => `$${value.toFixed(0)}`

export function Visit({ onNotice }: VisitProps) {
  const {services,extras,loading,error:serviceError}=useServices()
  const [readingPolicy, setReadingPolicy] = useState(false)
  const [category, setCategory] = useState('All styles')
  const [selected, setSelected] = useState<Service | null>(null)
  const [lengthIndex, setLengthIndex] = useState(0)
  const [addOns, setAddOns] = useState<string[]>([])
  const [agreed, setAgreed] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [booking, setBooking] = useState<BookingDetails | undefined>()
  const [receipt, setReceipt] = useState('')
  const [photo, setPhoto] = useState<Service | null>(null)
  const [date,setDate]=useState('')
  const hours=bookingHours(date)
  const deposit=serviceDeposit(selected ?? undefined)
  const length = selected?.lengths[lengthIndex]
  const extrasTotal = extras.filter(extra => addOns.includes(extra.name)).reduce((sum, extra) => sum + extra.price, 0)
  const total = length?.price == null ? null : length.price + extrasTotal
  const parts = new Intl.DateTimeFormat('en-US', {timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date())
  const part = (type: string) => parts.find(item => item.type === type)?.value
  const minDate = `${part('year')}-${part('month')}-${part('day')}`
  const select = (service: Service) => {
    setReadingPolicy(false); setSelected(service); setLengthIndex(0); setAddOns([]); setAgreed(false)
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected || !length || !agreed) return
    const data = new FormData(event.currentTarget)
    const details: BookingDetails = { serviceId:selected.id, length:length.name, extras:addOns, date:String(data.get('date')), time:String(data.get('time')), notes:String(data.get('notes') || ''), policyAccepted:agreed }
    try { validateBooking(details,new Date(),{services,extras}) } catch(error) { onNotice(error instanceof Error ? error.message : 'Check appointment details.'); return }
    setBooking(details)
    setPaymentOpen(true)
  }

  return <section id="visit" className="border-t border-ink/10 bg-sand/30">
    <div className="mx-auto max-w-[1440px] px-6 py-24 md:px-10">
      <p className="hud text-mocha">Your next look</p>
      <h2 className="display mt-4 text-[clamp(2rem,5vw,3.5rem)]">Choose your style. Make it yours.</h2>
      <p className="mt-5 max-w-2xl text-mocha leading-relaxed">Browse services, choose your style and add the finishing touches. Men’s and kids’ natural styles are performed on your own hair. A $20 deposit for men’s and kids’ natural styles or $50 for other services goes toward your service total. Choose your appointment date and time, then pay the deposit to complete your booking. Your selected time is honoured upon successful payment.</p>
      <p className="mt-4 text-sm font-semibold">{BOOKING_HOURS}</p>
      <div className="mt-6 flex flex-wrap items-center gap-6 text-sm"><Policies /><span className="text-mocha">24-hour cancellation notice · 15-minute grace period</span></div>
      <div className="mt-10 flex flex-wrap gap-2" aria-label="Filter services">
        {['All styles', ...new Set(services.map(s=>s.category))].map(item => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={`rounded-full border px-5 py-3 text-sm ${category === item ? 'bg-ink text-porcelain border-ink' : 'border-ink/20 hover:border-gold'}`}>{item}</button>)}
      </div>
      {serviceError && <p role="alert" className="mt-8 border border-ink/20 p-4 text-mocha">{serviceError}</p>}
      {loading && <p className="mt-8 text-mocha">Loading services…</p>}
      {!loading && !serviceError && services.length===0 && <p className="mt-8 text-mocha">No appointments are available to book right now. Please contact the studio.</p>}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {services.filter(service => category === 'All styles' || service.category === category).map(service => <article key={service.id} className="overflow-hidden rounded-lg border border-ink/10 bg-porcelain transition-transform motion-safe:hover:-translate-y-1">
          {service.image ? <button type="button" onClick={() => setPhoto(service)} className="block w-full" aria-label={`Enlarge ${service.name} photo`}><img src={service.image} alt={service.name} loading="lazy" className="aspect-[4/3] w-full object-cover" /></button> : <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 bg-linen text-mocha" aria-label={`${service.name} photo coming soon`}><span className="display text-5xl text-gold/60" aria-hidden="true">✧</span><span className="hud">Style photo coming soon</span></div>}
          <div className="p-6"><p className="hud text-mocha">{service.category}{service.rows ? ` · ${service.rows}` : ''}</p><h3 className="display mt-3 text-2xl">{service.name}</h3>{service.category === 'Natural styles' && <p className="mt-2 text-xs text-mocha">Natural hair service</p>}
            <dl className="my-5 space-y-2 text-sm">{service.lengths.map(option => <div key={option.name} className="flex justify-between gap-3"><dt>{option.name}</dt><dd className="font-mono text-gold">{option.price == null ? 'Request quote' : money(option.price)}</dd></div>)}</dl>
            <ShaderButton full tone="quiet" onClick={() => select(service)}>Choose this style</ShaderButton>
          </div>
        </article>)}
      </div>
      <p className="mt-8 text-sm text-mocha">Please arrive with washed, blow-dried and detangled hair, or add wash and blow dry. </p>
      <Lightbox open={Boolean(selected) && !paymentOpen} onClose={() => { if (readingPolicy) setReadingPolicy(false); else setSelected(null) }} title={readingPolicy ? 'Policies & guidelines' : selected ? `Book · ${selected.name}` : 'Book an appointment'}>
        {readingPolicy && <div className="space-y-4 text-sm leading-7"><button type="button" className="border border-ink/20 px-4 py-2" onClick={() => setReadingPolicy(false)}>Back to your booking</button>{policyText.split('\n').slice(2).map((line, index) => <p key={index} className={line.length < 65 ? 'display pt-3 text-xl font-semibold' : ''}>{line}</p>)}</div>}
        {selected && <form onSubmit={submit} className="space-y-6" style={{ display: readingPolicy ? 'none' : undefined }}>
          <p className="text-sm leading-relaxed text-mocha">Choose your appointment date and time. Pay the mandatory {money(deposit)} deposit at secure checkout to book that time. All appointment times use the Baltimore studio timezone (America/New_York).</p>
          <label className="block text-sm">Style / length<select className="booking-input" value={lengthIndex} disabled={paymentOpen} onChange={event => setLengthIndex(Number(event.target.value))}>{selected.lengths.map((option, index) => <option key={option.name} value={index}>{option.name} · {option.price == null ? 'Quote required' : money(option.price)}</option>)}</select></label>
          <fieldset disabled={paymentOpen}><legend className="mb-3 text-sm">Finishing touches &amp; preparation</legend><div className="grid gap-3 sm:grid-cols-2">{extras.map(extra => <label key={extra.name} className="flex items-center gap-3 border border-ink/10 p-3 text-sm"><input type="checkbox" checked={addOns.includes(extra.name)} onChange={event => setAddOns(current => event.target.checked ? [...current, extra.name] : current.filter(name => name !== extra.name))} />{extra.name}<span className="ml-auto text-gold">+{money(extra.price)}</span></label>)}</div></fieldset>
          <div className="rounded bg-sand/60 p-4 text-sm"><div className="flex justify-between"><span>Service total</span><strong>{total == null ? 'Quote required' : money(total)}</strong></div><div className="mt-3 flex justify-between"><span>Required deposit</span><strong>{money(deposit)}</strong></div><div className="mt-3 flex justify-between"><span>Balance after deposit</span><strong>{total == null ? 'After quote' : money(total - deposit)}</strong></div><p className="mt-3 text-xs text-mocha">The deposit is applied toward your total, not added to it. Any additional charges will be discussed before your service.</p></div>
          <fieldset disabled={paymentOpen} className="grid gap-4 sm:grid-cols-2"><legend className="sr-only">Appointment date and time</legend>
            <label className="text-sm">Appointment date<input className="booking-input" name="date" type="date" min={minDate} value={date} onChange={e=>setDate(e.target.value)} required /></label>
            <label className="text-sm">Appointment time (America/New_York)<input className="booking-input" name="time" type="time" min={hours?.min} max={hours?.max} disabled={!hours} required /></label>
            <label className="text-sm sm:col-span-2">Notes or hair sensitivities<textarea className="booking-input" name="notes" rows={3} maxLength={1000} /></label>
          </fieldset>
          {date && !hours && <p role="alert" className="text-sm text-red-800">The studio is closed on Sundays. Choose Monday through Saturday.</p>}
          <div className="text-sm"><button type="button" className="underline underline-offset-4" onClick={() => setReadingPolicy(true)}>Policies &amp; guidelines</button><label className="mt-4 flex items-start gap-3"><input className="mt-1" type="checkbox" required disabled={paymentOpen} checked={agreed} onChange={event => setAgreed(event.target.checked)} /><span>I agree to the policies and the mandatory {money(deposit)} deposit. I understand that my chosen appointment time is booked after successful deposit payment.</span></label></div>
          <ShaderButton full type="submit">Continue to pay {money(deposit)} deposit</ShaderButton>
        </form>}
      </Lightbox>
      <PaymentModal open={paymentOpen} booking={booking} subtotal={deposit} onClose={() => setPaymentOpen(false)} onSuccess={message => { setPaymentOpen(false); setSelected(null); setReceipt(message) }} />
      <Lightbox open={Boolean(receipt)} onClose={() => setReceipt('')} title="Appointment booked"><p className="leading-relaxed">{receipt}</p></Lightbox>
      <ImageViewer open={Boolean(photo)} name={photo?.name || 'Braiding style'} photos={services.filter(s => s.image).map(s => s.image)} index={Math.max(0, services.filter(s => s.image).findIndex(s => s.id === photo?.id))} onIndexChange={index => setPhoto(services.filter(s => s.image)[index])} onClose={() => setPhoto(null)} />
    </div>
  </section>
}
