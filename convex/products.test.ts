/// <reference types="vite/client" />
import { afterEach, expect, test, vi } from 'vitest'
import { ConvexError } from 'convex/values'
import { convexTest } from 'convex-test'
import schema from './schema'
import { api } from './_generated/api'
import { readableProductError } from '../shared/productErrors'
const modules=import.meta.glob('./**/*.ts')
const product={slug:'test-wig',name:'Test wig',tag:'',subtitle:'Human hair',price:200,image:'/main.jpg',images:[{url:'/extra.jpg',fileId:'extra-id'}],category:'wigs' as const,origin:'',detail:'',specs:[],lengths:['18'],active:true,order:1}
afterEach(()=>vi.unstubAllEnvs())
async function admin(){const t=convexTest(schema,modules);const id=await t.run(ctx=>ctx.db.insert('users',{email:'admin@example.com'}));vi.stubEnv('ADMIN_EMAILS','admin@example.com');return {t,client:t.withIdentity({subject:`${id}|session`})}}
test('admin saves and edits multiple extra images',async()=>{const {t,client}=await admin();await client.mutation(api.products.save,product);await client.mutation(api.products.save,{...product,images:[...product.images,{url:'/second.jpg',fileId:'second-id'}]});const saved=(await t.run(ctx=>ctx.db.query('products').take(1)))[0];expect(saved.images).toHaveLength(2);expect(saved.images?.[1].url).toBe('/second.jpg')})
test('invalid product price returns a readable structured error',async()=>{const {client}=await admin();try{await client.mutation(api.products.save,{...product,price:0});throw new Error('Expected validation error')}catch(error){expect(readableProductError(error)).toBe('Enter a product price greater than $0.')}})
test('missing studio access setup is explained without a deployment command',async()=>{const {client}=await admin();vi.stubEnv('ADMIN_EMAILS','');await expect(client.mutation(api.products.save,product)).rejects.toThrow('Product editing has not been enabled')})
test('safe error formatting keeps known causes and omits raw server traces',()=>{expect(readableProductError(new ConvexError({code:'IMAGE_REQUIRED',message:'Add the main product image.'}))).toBe('Add the main product image.');expect(readableProductError(new Error('Failed to fetch'))).toContain('internet connection');expect(readableProductError(new Error('ArgumentValidationError extra field'))).toContain('different formats');const error=readableProductError(new Error('[Request ID: abc123] Server Error\n at products.ts:12'));expect(error).toContain('abc123');expect(error).not.toContain('products.ts')})
