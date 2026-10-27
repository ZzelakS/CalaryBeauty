import {expect,test} from 'vitest'
import {validateBooking} from '../shared/booking'
import {parseCustomer} from '../shared/checkout'
import {services} from '../shared/services'
const address={firstName:'Jane',lastName:'Doe',company:'',address:'10 Main St',address2:'',city:'Baltimore',state:'MD',zip:'21201',country:'US'}
const booking={serviceId:'medium-knotless',length:'Waist length',extras:['Beads'],date:'2099-10-20',time:'14:30',notes:'',policyAccepted:true}
test('knotless thigh options remain removed; regular braids retain them',()=>{expect(services.filter(s=>s.category==='Knotless').every(s=>s.lengths.every(l=>l.name!=='Thigh length'))).toBe(true);expect(services.filter(s=>s.category==='Regular braids').every(s=>s.lengths.some(l=>l.name==='Thigh length'))).toBe(true);expect(()=>validateBooking({...booking,length:'Thigh length'})).toThrow()})
test('customer address validation and appointment policy checks remain enforced',()=>{expect(()=>parseCustomer({email:'jane@example.com',phone:'5550100200',billing:{...address,address:'A'.repeat(60),address2:'Suite 1'},shipping:address})).toThrow();for(const patch of [{date:'2020-01-01'},{policyAccepted:false},{extras:['Beads','Beads']},{extras:['fake']}])expect(()=>validateBooking({...booking,...patch})).toThrow()})
