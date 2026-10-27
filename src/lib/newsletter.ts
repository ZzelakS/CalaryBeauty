import { convexSiteUrl } from './convex'
export async function newsletterRequest(path:'subscribe'|'confirm',body:unknown):Promise<string>{
 const base=convexSiteUrl()
 if(!base)throw new Error('Email signup is not available yet. Please contact the studio.')
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000)
 try{
  const response=await fetch(`${base}/newsletter/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal})
  const result=await response.json() as {ok?:boolean;message?:string}
  if(!response.ok || !result.ok)throw new Error(result.message || 'Please try again shortly.')
  return result.message || 'Request received.'
 }catch(error){if(error instanceof TypeError || (error instanceof Error && error.name==='AbortError'))throw new Error('We could not connect. Check your connection and try again.');throw error}finally{clearTimeout(timer)}
}
