import { useEffect } from 'react'
export function WalletReturn(){
 useEffect(()=>{
  const query=new URLSearchParams(window.location.search)
  if(window.opener)window.opener.postMessage({type:'calary-paypal-return',reference:query.get('reference'),state:query.get('state'),result:query.get('result'),payerId:query.get('PayerID')},window.location.origin)
 },[])
 return <main className="min-h-screen bg-linen p-10 text-ink"><h1 className="display text-3xl">Returning from PayPal</h1><p className="mt-5">Keep your checkout window open while the studio confirms payment. This return page alone does not confirm payment.</p><p className="mt-3">If your checkout window is closed, contact the studio with your checkout reference before paying again.</p></main>
}
