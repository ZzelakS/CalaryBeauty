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
    throw new Error('Image uploads have not been connected to the store. Ask the site administrator to finish image-upload setup, or paste an image URL.')
  }
  const response = await fetch(authEndpoint, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(
      response.status === 401 || response.status === 403 ? 'The image service refused access. Ask the site administrator to check the upload permissions.' : response.status === 503 || response.status === 500 ? 'The image-upload service is unavailable or missing its private key. Ask the site administrator to check the image-service setup.' : `The image-upload service could not authorize your upload (status ${response.status}). Try again or paste an image URL.`,
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
      new Error('Image uploads have not been set up. Ask the site administrator to connect the image service, or paste an image URL.'),
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
