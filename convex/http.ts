import { createCheckout, checkoutStatus, webhook as stripeWebhook, preflight as stripePreflight } from './stripe'
import { signup,confirm,preflight as newsletterPreflight } from './newsletter'
import { httpRouter } from 'convex/server'

import { auth } from './auth'
import {
  auth as imagekitAuth,
  authPreflight,
} from './imagekit'



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

http.route({path:'/newsletter/subscribe',method:'POST',handler:signup})
http.route({path:'/newsletter/confirm',method:'POST',handler:confirm})
for(const path of ['/newsletter/subscribe','/newsletter/confirm'])http.route({path,method:'OPTIONS',handler:newsletterPreflight})
http.route({path:'/stripe-checkout',method:'POST',handler:createCheckout})
http.route({path:'/stripe-checkout-status',method:'POST',handler:checkoutStatus})
http.route({path:'/stripe-webhook',method:'POST',handler:stripeWebhook})
for(const path of ['/stripe-checkout','/stripe-checkout-status'])http.route({path,method:'OPTIONS',handler:stripePreflight})
export default http