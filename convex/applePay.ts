'use node'
import { request as httpsRequest } from 'node:https'
import { internalAction } from './_generated/server'
import { v } from 'convex/values'

export const validateMerchant=internalAction({
  args:{validationURL:v.string()},returns:v.string(),
  handler:async(_ctx,{validationURL})=>{
    if(process.env.AUTHORIZENET_APPLE_PAY_ENABLED!=='true')throw new Error('Apple Pay is not available yet.')
    const url=new URL(validationURL)
    // Apple supplies this URL. Restrict it before sending the merchant identity certificate.
    if(url.protocol!=='https:' || url.port || url.username || url.password || !/^apple-pay-gateway(?:-nc|-[a-z]{2}-pod\d+)?\.apple\.com$/.test(url.hostname) || url.pathname!=='/paymentservices/startSession')throw new Error('Invalid Apple Pay validation address.')
    const cert=process.env.APPLE_PAY_MERCHANT_CERT_PEM,key=process.env.APPLE_PAY_MERCHANT_KEY_PEM,merchantIdentifier=process.env.APPLE_PAY_MERCHANT_ID,site=process.env.SITE_URL
    if(!cert || !key || !merchantIdentifier || !site)throw new Error('Apple Pay merchant setup is incomplete.')
    const domain=new URL(site);if(domain.protocol!=='https:')throw new Error('Apple Pay requires an HTTPS website.')
    const payload=JSON.stringify({merchantIdentifier,displayName:'Calary Beauty',initiative:'web',initiativeContext:domain.hostname})
    return new Promise<string>((resolve,reject)=>{
      const request=httpsRequest(url,{method:'POST',cert:cert.replace(/\\n/g,'\n'),key:key.replace(/\\n/g,'\n'),headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)},timeout:10000},response=>{
        let data='';response.on('data',chunk=>{data+=chunk;if(data.length>65536)request.destroy(new Error('Apple Pay response too large.'))});response.on('end',()=>{if(response.statusCode!==200){reject(new Error('Apple Pay could not validate this merchant. Ask the studio to check its certificate and verified domain.'));return}try{JSON.parse(data);resolve(data)}catch{reject(new Error('Apple Pay returned an unreadable merchant session.'))}})
      });request.on('timeout',()=>request.destroy(new Error('Apple Pay validation timed out. Please try again.')));request.on('error',()=>reject(new Error('Could not connect to Apple Pay merchant validation. Check the merchant identity certificate and try again.')));request.end(payload)
    })
  }
})
