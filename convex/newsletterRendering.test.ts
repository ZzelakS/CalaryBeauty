import {createElement} from 'react'
import {renderToString} from 'react-dom/server'
import {act,create,type ReactTestRenderer} from 'react-test-renderer'
import {afterEach,expect,test,vi} from 'vitest'
import type {Product} from '../src/data/products'
const mocks=vi.hoisted(()=>({request:vi.fn()}))
vi.mock('../src/lib/newsletter',()=>({newsletterRequest:mocks.request}))
import {Newsletter} from '../src/components/Newsletter'
import {ProductCard} from '../src/components/ProductCard'
afterEach(()=>{vi.unstubAllGlobals();mocks.request.mockReset()})
test('sold-out product card renders a visible badge and disabled purchase control',()=>{vi.stubGlobal('window',{matchMedia:()=>({matches:false})});const product:Product={id:'test',name:'Test unit',subtitle:'Example',tag:'',price:100,image:'/example.jpg',category:'wigs',origin:'',detail:'',specs:[],active:true,order:0,inStock:false};const html=renderToString(createElement(ProductCard,{product,index:0,onOpen:()=>{},onAdd:()=>{}}));expect(html).toContain('stock-badge');expect(html).toContain('Out of stock');expect(html).toMatch(/disabled=""/);expect(html).not.toContain('Add to bag')})
test('newsletter form sends explicit consent and displays queued confirmation feedback without sending real email',async()=>{
 mocks.request.mockResolvedValue('Check your inbox for a confirmation link.')
 vi.stubGlobal('FormData',class{get(){return ''}})
 let renderer:ReactTestRenderer
 act(()=>{renderer=create(createElement(Newsletter))})
 act(()=>renderer!.root.findByProps({type:'email'}).props.onChange({target:{value:'test@example.com'}}))
 act(()=>renderer!.root.findByProps({type:'checkbox'}).props.onChange({target:{checked:true}}))
 await act(async()=>{await renderer!.root.findByType('form').props.onSubmit({preventDefault(){},currentTarget:{}})})
 expect(mocks.request).toHaveBeenCalledWith('subscribe',{email:'test@example.com',consent:true,website:''});expect(JSON.stringify(renderer!.toJSON())).toContain('Check your inbox');expect(renderer!.root.findByProps({type:'checkbox'}).props.checked).toBe(false)
 act(()=>renderer!.unmount())
})
