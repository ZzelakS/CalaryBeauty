import {createElement} from 'react'
import {renderToString} from 'react-dom/server'
import {afterEach,expect,test,vi} from 'vitest'
import {services,extras} from '../shared/services'
vi.mock('../src/components/Lightbox',()=>({Lightbox:({children}:any)=>children}))
vi.mock('../src/store/services',()=>({useServices:()=>({services,extras})}))
vi.mock('../src/lib/stripe',()=>({affirmEnabled:true,readPendingStripe:()=>null,pendingStripeUrl:()=>'',startStripeCheckout:vi.fn()}))
import {PaymentModal} from '../src/components/PaymentModal'
afterEach(()=>vi.unstubAllGlobals())
test('product checkout offers card and Affirm through Stripe without raw card fields or old gateway scripts',()=>{
 const html=renderToString(createElement(PaymentModal,{open:true,subtotal:300,onClose(){},onSuccess(){}}))
 expect(html).toContain('Credit or debit card');expect(html).toContain('Pay over time with Affirm');expect(html).toContain('powered by Stripe');expect(html).toContain('$310');expect(html).not.toContain('cardNumber');expect(html).not.toContain('cardCode');expect(html).not.toContain('Authorize.net');expect(html).not.toContain('Accept.js')
})
test('new natural appointment checkout shows $20 deposit, correct balance, no shipping address or Affirm',()=>{
 const s=services.find(s=>s.id==='natural-twists')!
 const html=renderToString(createElement(PaymentModal,{open:true,subtotal:20,booking:{serviceId:s.id,length:s.lengths[1].name,extras:[],date:'2099-01-05',time:'10:00',notes:'',policyAccepted:true},onClose(){},onSuccess(){}}))
 expect(html).toContain('$20');expect(html).toContain('$40');expect(html).toContain('No shipping fee');expect(html).not.toContain('Pay over time with Affirm');expect(html).not.toContain('shipping.firstName');expect(html).toContain('billing.firstName')
})
