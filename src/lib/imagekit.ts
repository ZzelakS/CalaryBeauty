const publicKey = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY as string | undefined
const urlEndpoint = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT as string | undefined
import { convexSiteUrl } from './convex'

/**
 * Signed by the `imagekit-auth` HTTP action on the Convex deployment, which is
 * served from `.convex.site`. Override only if you host the signer elsewhere.
 */
const authEndpoint =
  (import.meta.env.VITE_IMAGEKIT_AUTH_ENDPOINT as string | undefined) ||
  (convexSiteUrl() ? `${convexSiteUrl()}/imagekit-auth` : '')
const folder = (import.meta.env.VITE_IMAGEKIT_FOLDER as string | undefined) || '/calary/products'

export const isImageKitConfigured = Boolean(publicKey && urlEndpoint && authEndpoint)

export interface UploadedImage {
  url: string
  fileId: string
  name: string
}

interface AuthParams {
  token: string
  expire: number
  signature: string
}

/**
 * The private key never reaches the browser. `api/imagekit-auth` signs a short
 * lived token server-side and this posts the file straight to ImageKit with it.
 */
async function getAuthParams(): Promise<AuthParams> {
  if (!authEndpoint) {
    throw new Error('No upload signer — set VITE_CONVEX_URL, or VITE_IMAGEKIT_AUTH_ENDPOINT.')
  }
  const response = await fetch(authEndpoint, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(
      `Upload auth failed (${response.status}). Check the deployment has IMAGEKIT_PRIVATE_KEY set: npx convex env set IMAGEKIT_PRIVATE_KEY private_xxx`,
    )
  }
  const data = (await response.json()) as Partial<AuthParams>
  if (!data.token || !data.signature || !data.expire) {
    throw new Error('Upload auth returned an unexpected response.')
  }
  return { token: data.token, expire: Number(data.expire), signature: data.signature }
}

export function uploadImage(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadedImage> {
  if (!isImageKitConfigured) {
    return Promise.reject(
      new Error('ImageKit is not configured — add VITE_IMAGEKIT_PUBLIC_KEY and VITE_IMAGEKIT_URL_ENDPOINT.'),
    )
  }

  return getAuthParams().then(
    (auth) =>
      new Promise<UploadedImage>((resolve, reject) => {
        const body = new FormData()
        body.append('file', file)
        body.append('fileName', file.name)
        body.append('publicKey', publicKey as string)
        body.append('signature', auth.signature)
        body.append('expire', String(auth.expire))
        body.append('token', auth.token)
        body.append('folder', folder)
        body.append('useUniqueFileName', 'true')

        const request = new XMLHttpRequest()
        request.open('POST', 'https://upload.imagekit.io/api/v1/files/upload')

        request.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            onProgress?.(Math.round((event.loaded / event.total) * 100))
          }
        }

        request.onload = () => {
          try {
            const data = JSON.parse(request.responseText) as {
              url?: string
              fileId?: string
              name?: string
              message?: string
            }
            if (request.status >= 200 && request.status < 300 && data.url && data.fileId) {
              resolve({ url: data.url, fileId: data.fileId, name: data.name ?? file.name })
            } else {
              reject(new Error(data.message || `ImageKit rejected the upload (${request.status})`))
            }
          } catch {
            reject(new Error('ImageKit returned a response that could not be read.'))
          }
        }

        request.onerror = () => reject(new Error('Network error while uploading to ImageKit.'))
        request.send(body)
      }),
  )
}

/**
 * ImageKit resizes on the fly, so ask for the size actually being displayed.
 * Local files (the bundled placeholders) are returned untouched.
 */
export function imageUrl(src: string, width: number, height?: number): string {
  if (!src || !urlEndpoint || !src.startsWith(urlEndpoint)) return src
  const parts = [`w-${width}`]
  if (height) parts.push(`h-${height}`, 'fo-auto')
  parts.push('q-82')
  const separator = src.includes('?') ? '&' : '?'
  return `${src}${separator}tr=${parts.join(',')}`
}
