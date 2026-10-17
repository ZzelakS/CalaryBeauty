import { ConvexError } from 'convex/values'
export function productError(code:string,message:string):never { throw new ConvexError({code,message}) }
export function readableProductError(error:unknown):string {
  if(error instanceof ConvexError && error.data && typeof error.data==='object' && 'message' in error.data && typeof error.data.message==='string')return error.data.message
  const message=error instanceof Error ? error.message : ''
  if(/fetch|network|offline|connection/i.test(message))return 'We could not reach the store. Check your internet connection and try saving again. Your entries are still here.'
  if(/Could not find public function|not deployed/i.test(message))return 'The store’s product-saving service has not been updated yet. Ask the site administrator to deploy the latest update, then try again.'
  if(/ArgumentValidationError|does not match the validator|extra field/i.test(message))return 'The store could not accept these product details because the page and saving service use different formats. Reload the page. If this continues, ask the site administrator to update both.'
  if(/unauthenticated|unauthorized|session|sign in/i.test(message))return 'Your sign-in has expired. Sign in again, then save the product.'
  const reference=message.match(/Request ID:\s*([^\]\s]+)/i)?.[1]
  return `The store could not save this product. Your entries are still here. Try again; if it continues, contact the site administrator${reference ? ` with reference ${reference}` : ''}.`
}
