import { httpRouter } from 'convex/server'
import { auth } from './auth'
import { auth as imagekitAuth, authPreflight } from './imagekit'

const http = httpRouter()

// /api/auth/* — sign in, sign out, token refresh
auth.addHttpRoutes(http)

// https://<deployment>.convex.site/imagekit-auth
http.route({ path: '/imagekit-auth', method: 'GET', handler: imagekitAuth })
http.route({ path: '/imagekit-auth', method: 'OPTIONS', handler: authPreflight })

export default http
