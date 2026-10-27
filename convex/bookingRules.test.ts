/// <reference types="vite/client" />
import {expect,test,vi,afterEach} from 'vitest'
import {convexTest} from 'convex-test'
import schema from './schema'
import {api} from './_generated/api'
import {validateBookingHours} from '../shared/bookingHours'
import {validateBooking} from '../shared/booking'
import {newNaturalServices,services,serviceDeposit} from '../shared/services'
const modules=import.meta.glob('./**/*.ts')
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks()})
// 2099-01-05 Monday, 10 Saturday, 11 Sunday.
test('weekday and Saturday opening and closing boundaries; Sunday closed',()=>{
 for(const day of ['2099-01-05','2099-01-06','2099-01-07','2099-01-08','2099-01-09']){
  expect(()=>validateBookingHours(day,'09:30')).not.toThrow()
  expect(()=>validateBookingHours(day,'19:00')).not.toThrow()
  for(const time of ['00:00','09:29','19:01','23:59'])expect(()=>validateBookingHours(day,time)).toThrow('studio hours')
 }
 for(const time of ['09:00','19:00'])expect(()=>validateBookingHours('2099-01-10',time)).not.toThrow()
 for(const time of ['08:59','19:01'])expect(()=>validateBookingHours('2099-01-10',time)).toThrow('studio hours')
 expect(()=>validateBookingHours('2099-01-11','12:00')).toThrow('Sunday closed')
 for(const date of ['2099-02-30','invalid','2099-13-01'])expect(()=>validateBookingHours(date,'12:00')).toThrow('valid appointment')
})
test('all five new option prices and deposits; legacy deposit unchanged; Eastern future check',()=>{
 expect(newNaturalServices.flatMap(s=>s.lengths.map(l=>l.price))).toEqual([50,60,70,70,60])
 for(const s of newNaturalServices){
  const result=validateBooking({serviceId:s.id,length:s.lengths[0].name,extras:[],date:'2099-01-05',time:'09:30',notes:'',policyAccepted:true})
  expect(result.deposit).toBe(20);expect(result.total).toBe(s.lengths[0].price)
 }
 expect(serviceDeposit(services.find(s=>s.id==='small-knotless'))).toBe(50)
 expect(()=>validateBooking({serviceId:newNaturalServices[0].id,length:newNaturalServices[0].lengths[0].name,extras:[],date:'2099-01-05',time:'09:30',notes:'',policyAccepted:true},new Date('2099-01-05T14:30:00Z'))).toThrow('future')
})
test('admin installation adds missing services once and preserves edits and hidden state',async()=>{
 const t=convexTest(schema,modules)
 await expect(t.mutation(api.services.addNaturalStyles,{})).rejects.toThrow('sign-in')
 const id=await t.run(ctx=>ctx.db.insert('users',{email:'admin@example.com'}));vi.stubEnv('ADMIN_EMAILS','admin@example.com')
 const client=t.withIdentity({subject:`${id}|session`})
 await t.run(async ctx=>{await ctx.db.insert('serviceSettings',{key:'catalog',extras:[],updatedAt:0});await ctx.db.insert('services',{slug:'small-knotless',name:'Custom name',category:'Knotless',rows:'',image:'',lengths:[{name:'Waist',price:430}],active:false,order:0,updatedAt:0})})
 expect(await client.mutation(api.services.addNaturalStyles,{})).toEqual({added:2,skipped:0})
 expect(await client.mutation(api.services.addNaturalStyles,{})).toEqual({added:0,skipped:2})
 const rows=await client.query(api.services.listAll)
 expect(rows.services.find(s=>s.id==='small-knotless')).toMatchObject({name:'Custom name',active:false,deposit:50})
 expect(rows.services.filter(s=>s.deposit===20)).toHaveLength(2)
})
test('admin deposit selection persists, old clients preserve it, prices must cover deposit',async()=>{
 const t=convexTest(schema,modules)
 const id=await t.run(ctx=>ctx.db.insert('users',{email:'admin@example.com'}));vi.stubEnv('ADMIN_EMAILS','admin@example.com')
 const client=t.withIdentity({subject:`${id}|session`})
 await client.mutation(api.services.addNaturalStyles,{})
 const s=newNaturalServices[0]
 const draft={slug:s.id,name:s.name,category:s.category,rows:s.rows,image:'',lengths:s.lengths.map(l=>({name:l.name,price:l.price!})),active:true,order:30,creating:false}
 await client.mutation(api.services.save,{...draft,deposit:20})
 await client.mutation(api.services.save,{...draft,name:'Edited men’s styles'})
 expect((await t.query(api.services.listPublic)).services.find(x=>x.id===s.id)?.deposit).toBe(20)
 await expect(client.mutation(api.services.save,{...draft,deposit:50,lengths:[{name:'Example',price:30}]})).rejects.toThrow('cover the deposit')
 await client.mutation(api.services.save,{...draft,deposit:50})
 expect((await t.query(api.services.listPublic)).services.find(x=>x.id===s.id)?.deposit).toBe(50)
 const payload={booking:{serviceId:s.id,date:'2099-01-05',time:'10:00',extras:[],length:s.lengths[0].name},customer:{}}
 const recordId=await t.run(ctx=>ctx.db.insert('paymentRecords',{requestId:'reschedule-test',kind:'booking',status:'paid',amount:20,payload:JSON.stringify(payload),updatedAt:0}))
 await expect(client.mutation(api.appointments.update,{id:recordId,date:'2099-01-11',time:'12:00',status:'confirmed',notes:''})).rejects.toThrow('studio hours')
 expect((await t.run(ctx=>ctx.db.get(recordId)))?.amount).toBe(20)
})
