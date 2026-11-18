import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { ConvexProvider, type ConvexReactClient } from 'convex/react'
import { expect,test,vi } from 'vitest'
vi.mock('../src/lib/convex',()=>({isConvexConfigured:true,convexSiteUrl:()=>''}))
import { ServicesProvider,useServices } from '../src/store/services'
import { ServicesAdmin } from '../src/admin/ServicesAdmin'
function fakeClient(result:unknown,error=false){return {watchQuery:()=>({localQueryResult:()=>{if(error)throw result;return result},onUpdate:()=>()=>{},journal:()=>undefined})} as unknown as ConvexReactClient}
function Content(){const catalog=useServices();return createElement('main',null,'Storefront stays mounted',catalog.error ?? 'Services loaded')}
test('failed service query renders the storefront message without a React rerender loop',()=>{const html=renderToString(createElement(ConvexProvider,{client:fakeClient(new Error('Server Error'),true)},createElement(ServicesProvider,null,createElement(Content))));expect(html).toContain('Storefront stays mounted');expect(html).toContain('temporarily unavailable')})
test('loading and empty live service catalogs render without a rerender loop',()=>{for(const result of [undefined,{services:[],extras:[]}]){const html=renderToString(createElement(ConvexProvider,{client:fakeClient(result)},createElement(ServicesProvider,null,createElement(Content))));expect(html).toContain('Storefront stays mounted')}})
test('admin service query failure stays within its own section',()=>{const html=renderToString(createElement(ConvexProvider,{client:fakeClient(new Error('Server Error'),true)},createElement(ServicesAdmin)));expect(html).toContain('Braiding services unavailable')})

// Render a second time with mounted hook state, as a real storefront update does.
// Server rendering alone cannot expose subscription identity render loops.
import { act,create,type ReactTestRenderer } from 'react-test-renderer'
test('mounted storefront survives parent updates and failed query state',()=>{
 const client=fakeClient(new Error('Server Error'),true)
 let renderer:ReactTestRenderer
 const tree=()=>createElement(ConvexProvider,{client},createElement(ServicesProvider,null,createElement(Content)))
 act(()=>{renderer=create(tree())})
 expect(()=>act(()=>renderer.update(tree()))).not.toThrow()
 expect(JSON.stringify(renderer!.toJSON())).toContain('Storefront stays mounted')
 act(()=>renderer!.unmount())
})
test('mounted admin service view survives parent updates when the query fails',()=>{
 const client=fakeClient(new Error('Server Error'),true)
 let renderer:ReactTestRenderer
 const tree=()=>createElement(ConvexProvider,{client},createElement(ServicesAdmin))
 act(()=>{renderer=create(tree())})
 expect(()=>act(()=>renderer.update(tree()))).not.toThrow()
 act(()=>renderer!.unmount())
})
