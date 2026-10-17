import { httpAction } from './_generated/server'
import { internal } from './_generated/api'
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'}
export const preflight=httpAction(async()=>new Response(null,{status:204,headers}))
export const appleMerchant=httpAction(async(ctx,request)=>{
 try{
  if(process.env.AUTHORIZENET_APPLE_PAY_ENABLED!=='true')return new Response(JSON.stringify({message:'Apple Pay is not available yet.'}),{status:503,headers})
  if(!process.env.SITE_URL || request.headers.get('Origin')!==new URL(process.env.SITE_URL).origin)return new Response(JSON.stringify({message:'Apple Pay validation is only available on the studio website.'}),{status:403,headers})
  const body=await request.json()
  if(typeof body.validationURL!=='string')throw new Error('Missing Apple Pay validation address.')
  const session=await ctx.runAction(internal.applePay.validateMerchant,{validationURL:body.validationURL})
  return new Response(session,{headers})
 }catch{return new Response(JSON.stringify({message:'Apple Pay could not verify the studio. Please use another payment option or ask the studio to check Apple Pay setup.'}),{status:400,headers})}
})
