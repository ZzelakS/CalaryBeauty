import { services, extras, DEPOSIT, type Service } from './services'
import type { BookingDetails } from './checkout'
export function validateBooking(value: unknown, now = new Date(), catalog: {services:Service[];extras:{name:string;price:number}[]} = {services,extras}): { booking: BookingDetails; total: number; serviceName: string } {
  const {services,extras}=catalog
  if(!value || typeof value!=='object')throw new Error('Appointment details are required.')
  const b=value as Record<string,unknown>, service=services.find(item=>item.id===b.serviceId), length=service?.lengths.find(item=>item.name===b.length)
  if(!service || !length || length.price==null)throw new Error('Choose a valid style and length.')
  if(!Array.isArray(b.extras) || b.extras.length>extras.length || new Set(b.extras).size!==b.extras.length || b.extras.some(name=>typeof name!=='string' || !extras.some(extra=>extra.name===name)))throw new Error('Check your selected extras.')
  if(typeof b.date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.date) || new Date(`${b.date}T12:00:00Z`).toISOString().slice(0,10)!==b.date || typeof b.time!=='string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.time))throw new Error('Choose a valid appointment date and time.')
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now)
  const part=(name:string)=>parts.find(p=>p.type===name)?.value
  const current=`${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`
  if(`${b.date}T${b.time}`<=current)throw new Error('Choose a future appointment date and time in the studio timezone.')
  if(b.policyAccepted!==true)throw new Error('Please accept the policies and required $50 deposit.')
  if(typeof b.notes!=='string' || b.notes.length>1000)throw new Error('Appointment notes must be at most 1000 characters.')
  const names=b.extras as string[]
  const total=length.price + extras.filter(extra=>names.includes(extra.name)).reduce((sum,extra)=>sum+extra.price,0)
  if(total<DEPOSIT)throw new Error('Invalid service total.')
  return {booking:{serviceId:service.id,length:length.name,extras:names,date:b.date,time:b.time,notes:b.notes.trim(),policyAccepted:true},total,serviceName:service.name}
}
