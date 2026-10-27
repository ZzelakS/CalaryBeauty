import {query} from './_generated/server'
import {paginationOptsValidator} from 'convex/server'
import {requireAdmin} from './products'
export const list=query({args:{paginationOpts:paginationOptsValidator},handler:async(ctx,args)=>{
 await requireAdmin(ctx)
 const page=await ctx.db.query('paymentRecords').withIndex('by_kind',q=>q.eq('kind','order')).order('desc').paginate(args.paginationOpts)
 return {...page,page:page.page.map(record=>{
  // A corrupt historical payload must not take down the dashboard.
  let payload:Record<string,unknown>={}
  try{const value:unknown=JSON.parse(record.payload);if(value && typeof value==='object' && !Array.isArray(value))payload=value as Record<string,unknown>}catch{/* show the payment reference for manual review */}
  return {id:record._id,reference:record.requestId,provider:record.provider ?? 'authorize',status:record.status,amount:record.amount,refundedAmount:(record.stripeRefundedAmount ?? 0)/100,transactionId:record.transactionId ?? '',createdAt:record._creationTime,payload:JSON.stringify(payload)}
 })}
}})
