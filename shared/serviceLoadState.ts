import type { Service } from './services'
export interface ServiceCatalog {services:Service[];extras:{name:string;price:number}[]}
export interface ServiceLoadState extends ServiceCatalog {loading:boolean;error:string|null}
export function serviceLoadState(result:ServiceCatalog|Error|undefined):ServiceLoadState {
 if(result instanceof Error)return {services:[],extras:[],loading:false,error:'Appointment booking is temporarily unavailable. Please contact the studio or try again shortly.'}
 if(result===undefined)return {services:[],extras:[],loading:true,error:null}
 return {...result,loading:false,error:null}
}
