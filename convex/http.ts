import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { auth } from './auth'
import {
  auth as imagekitAuth,
  authPreflight,
} from './imagekit'
import { processPayment } from './payments'

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

export default http