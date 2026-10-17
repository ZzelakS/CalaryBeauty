import { signup,confirm,preflight as newsletterPreflight } from './newsletter'
import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { auth } from './auth'
import {
  auth as imagekitAuth,
  authPreflight,
} from './imagekit'
import { processPayment, completePaypal } from './payments'

import { appleMerchant, preflight } from './walletHttp'
const http = httpRouter()

// /api/auth/* — sign in, sign out, token refresh
auth.addHttpRoutes(http)

// https://<deployment>.convex.site/imagekit-auth
http.route({
  path: '/imagekit-auth',
  method: 'GET',
  handler: imagekitAuth,
})

http.route({
  path: '/imagekit-auth',
  method: 'OPTIONS',
  handler: authPreflight,
})

// Authorize.net production payment endpoint
http.route({
  path: '/authorize-net-payment',
  method: 'POST',
  handler: processPayment,
})

// CORS preflight for the payment endpoint
http.route({
  path: '/authorize-net-payment',
  method: 'OPTIONS',
  handler: httpAction(async () =>
    new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }),
  ),
})

http.route({path:'/authorize-net-paypal-complete',method:'POST',handler:completePaypal})
http.route({path:'/authorize-net-paypal-complete',method:'OPTIONS',handler:preflight})
http.route({path:'/authorize-net-apple-pay-session',method:'POST',handler:appleMerchant})
http.route({path:'/authorize-net-apple-pay-session',method:'OPTIONS',handler:preflight})
http.route({path:'/newsletter/subscribe',method:'POST',handler:signup})
http.route({path:'/newsletter/confirm',method:'POST',handler:confirm})
for(const path of ['/newsletter/subscribe','/newsletter/confirm'])http.route({path,method:'OPTIONS',handler:newsletterPreflight})
export default http