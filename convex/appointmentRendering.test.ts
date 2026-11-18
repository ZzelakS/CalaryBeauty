import { createElement } from 'react'
import { act,create,type ReactTestRenderer } from 'react-test-renderer'
import { ConvexProvider,type ConvexReactClient } from 'convex/react'
import { afterEach,expect,test,vi } from 'vitest'
const mocks=vi.hoisted(()=>({query:vi.fn()}))
vi.mock('convex/react',async importOriginal=>({...await importOriginal<typeof import('convex/react')>(),usePaginatedQuery:mocks.query}))
vi.mock('../src/lib/convex',()=>({isConvexConfigured:true,convexSiteUrl:()=>''}))
import { AppointmentsAdmin } from '../src/admin/AppointmentsAdmin'
afterEach(()=>{vi.restoreAllMocks();mocks.query.mockReset()})
test('appointment query failure preserves dashboard navigation and retry recovers',()=>{
 const silence=vi.spyOn(console,'error').mockImplementation(()=>{})
 mocks.query.mockImplementation(()=>{throw new Error('[CONVEX Q(appointments:list)] [Request ID: test-reference] Server Error')})
 const client={mutation:()=>Promise.resolve()} as unknown as ConvexReactClient
 let renderer:ReactTestRenderer
 act(()=>{renderer=create(createElement(ConvexProvider,{client},createElement('main',null,createElement('nav',null,'Products · Braiding services · Appointments'),createElement(AppointmentsAdmin))))})
 const failed=JSON.stringify(renderer!.toJSON());expect(failed).toContain('Products · Braiding services');expect(failed).toContain('could not load');expect(failed).toContain('test-reference')
 mocks.query.mockReturnValue({results:[],status:'Exhausted',loadMore:vi.fn()})
 const retry=renderer!.root.findAllByType('button').find(button=>button.children.includes('Try again'))!
 act(()=>retry.props.onClick())
 const recovered=JSON.stringify(renderer!.toJSON());expect(recovered).toContain('No paid appointments yet');expect(recovered).not.toContain('could not load')
 act(()=>renderer!.unmount());expect(silence).toHaveBeenCalled()
})
