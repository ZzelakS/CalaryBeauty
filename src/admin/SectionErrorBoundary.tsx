import { Component, type ReactNode, type ErrorInfo } from 'react'
interface Props {children:ReactNode;name:string}
interface State {error:Error|null;attempt:number}
export class SectionErrorBoundary extends Component<Props,State>{
 state:State={error:null,attempt:0}
 static getDerivedStateFromError(error:Error){return {error}}
 componentDidCatch(error:Error,info:ErrorInfo){console.error(`[Calary] ${this.props.name} section failed`,error,info.componentStack)}
 render(){
  if(!this.state.error)return <div key={this.state.attempt}>{this.props.children}</div>
  const reference=this.state.error.message.match(/Request ID:\s*([^\]\s]+)/i)?.[1]
  return <section><h1 className="display text-4xl">{this.props.name}</h1><p role="alert" className="mt-5 border border-ink/20 p-4">This section could not load. Your saved records have not been changed. You can still use the other dashboard tabs.</p><p className="mt-4 text-sm text-mocha">Ask the site administrator to check the Convex server log and confirm that the latest backend and schema were deployed to this website’s production deployment.</p>{reference && <p className="mt-3 break-all text-sm">Support reference: {reference}</p>}<button type="button" className="hud mt-5 border border-gold px-5 py-3" onClick={()=>this.setState(state=>({error:null,attempt:state.attempt+1}))}>Try again</button></section>
 }
}
