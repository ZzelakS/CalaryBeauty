import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

export default function AppointmentConfirm(){
 const token=new URLSearchParams(window.location.search).get('token')||''
 const confirm=useMutation(api.appointmentEmails.confirmByToken),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
 const respond=async(response:'confirmed'|'declined')=>{setBusy(true);try{await confirm({token,response});setMessage(response==='confirmed'?'Thank you — your appointment is confirmed.':'Your studio has been notified that you cannot make this appointment.')}catch(error){setMessage(error instanceof Error?error.message:'This confirmation link could not be used.')}finally{setBusy(false)}}
 return <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-16"><section className="w-full border border-ink/15 bg-porcelain p-8"><p className="hud text-mocha">Calary Beauty</p><h1 className="display mt-3 text-4xl">Confirm your appointment</h1><p className="mt-5 leading-7 text-mocha">Please let the studio know whether you can attend your paid appointment. Need a different time? Choose “I can’t make it” and contact the studio — do not make another booking.</p>{message?<p className="mt-6 border border-ink/20 p-4" role="status">{message}</p>:<div className="mt-8 flex flex-wrap gap-4"><button disabled={busy||!token} onClick={()=>void respond('confirmed')} className="border border-gold bg-gold/10 px-5 py-3">Yes, I’ll be there</button><button disabled={busy||!token} onClick={()=>void respond('declined')} className="border px-5 py-3">I can’t make it</button></div>}</section></main>
}
