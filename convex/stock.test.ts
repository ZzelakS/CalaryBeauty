/// <reference types="vite/client" />
import {afterEach,expect,test,vi} from 'vitest'
import {convexTest} from 'convex-test'
import schema from './schema'
import {api} from './_generated/api'
const modules=import.meta.glob('./**/*.ts')
const product={slug:'stock-test',name:'Test unit',tag:'',subtitle:'Test',price:100,image:'/image.jpg',category:'wigs' as const,origin:'',detail:'',specs:[],active:true,order:1}
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()})
async function setup(){const t=convexTest(schema,modules);const user=await t.run(ctx=>ctx.db.insert('users',{email:'admin@example.com'}));vi.stubEnv('ADMIN_EMAILS','admin@example.com');const admin=t.withIdentity({subject:`${user}|session`});await admin.mutation(api.products.save,product);return {t,admin}}
test('older stock defaults to available; stock toggle keeps sold-out product publicly visible',async()=>{const {t,admin}=await setup();expect((await t.query(api.products.listPublic))[0].inStock).toBe(true);await admin.mutation(api.products.setStock,{slug:product.slug,inStock:false});expect((await t.query(api.products.listPublic))[0]).toMatchObject({active:true,inStock:false});await admin.mutation(api.products.save,{...product,name:'Updated name'});expect((await t.query(api.products.listPublic))[0].inStock).toBe(false);await admin.mutation(api.products.setStock,{slug:product.slug,inStock:true});expect((await t.query(api.products.listPublic))[0].inStock).toBe(true)})
test('unauthorized users cannot change stock',async()=>{const {t}=await setup();await expect(t.mutation(api.products.setStock,{slug:product.slug,inStock:false})).rejects.toThrow('sign-in')})
