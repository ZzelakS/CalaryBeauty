import { useState } from 'react'
import { policyText } from '@/data/policies'
import { Lightbox } from './Lightbox'

export function Policies() {
  const [open, setOpen] = useState(false)
  return <><button type="button" onClick={() => setOpen(true)} className="underline underline-offset-4">Policies &amp; guidelines</button>
    <Lightbox open={open} onClose={() => setOpen(false)} title="Calary Beauty · Policies & guidelines">
      <div className="space-y-4 text-sm leading-7">{policyText.split('\n').slice(2).map((line, index) => <p key={index} className={line.length < 65 ? 'display pt-3 text-xl font-semibold' : ''}>{line}</p>)}</div>
    </Lightbox></>
}
