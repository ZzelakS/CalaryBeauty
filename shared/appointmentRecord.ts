/** Tolerate historical payment payloads without hiding their payment references. */
export function appointmentPayload(raw:string){
 const object=(value:unknown):Record<string,unknown>=>value && typeof value==='object' && !Array.isArray(value) ? value as Record<string,unknown>:{}
 const text=(value:unknown,fallback='')=>typeof value==='string' ? value:fallback
 let payload:Record<string,unknown>={}
 try{payload=object(JSON.parse(raw))}catch{ /* The row remains visible and is flagged for review. */ }
 const customer=object(payload.customer),billing=object(customer.billing),booking=object(payload.booking)
 const serviceId=text(booking.serviceId)
 const date=text(booking.date),time=text(booking.time)
 const email=text(customer.email),firstName=text(billing.firstName),lastName=text(billing.lastName)
 return {
  customer:{billing:{firstName:firstName || 'Customer details unavailable',lastName},email,phone:text(customer.phone)},
  booking:{serviceId,length:text(booking.length),extras:Array.isArray(booking.extras) ? booking.extras.filter((value):value is string=>typeof value==='string'):[],date,time,notes:text(booking.notes)},
  serviceTotal:typeof payload.serviceTotal==='number' && Number.isFinite(payload.serviceTotal) ? payload.serviceTotal:null,
  serviceName:text(payload.serviceName,serviceId.replace(/-/g,' ') || 'Service details unavailable'),
  needsReview:!serviceId || !date || !time || !email || !firstName || typeof payload.serviceTotal!=='number',
 }
}
