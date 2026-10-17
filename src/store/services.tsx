import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useQueries } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { services, extras } from '../../shared/services'
import { serviceLoadState, type ServiceCatalog, type ServiceLoadState } from '../../shared/serviceLoadState'
import { isConvexConfigured } from '@/lib/convex'
const initial:ServiceLoadState={services,extras,loading:false,error:null}
const Context=createContext<ServiceLoadState>(initial)
const catalogQuery={catalog:{query:api.services.listPublic,args:{}}}
function Connected({children}:{children:ReactNode}){
 // Unlike useQuery, useQueries returns server errors as values instead of throwing
 // during render. A services outage must not unmount the entire storefront.
 const {catalog}=useQueries(catalogQuery)
 const result=catalog as ServiceCatalog|Error|undefined
 useEffect(()=>{if(result instanceof Error)console.error('[Calary] Unable to load service catalog',result)},[result])
 return <Context.Provider value={serviceLoadState(result)}>{children}</Context.Provider>
}
export function ServicesProvider({children}:{children:ReactNode}){return isConvexConfigured ? <Connected>{children}</Connected>:<Context.Provider value={initial}>{children}</Context.Provider>}
export const useServices=()=>useContext(Context)
