/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string
  readonly VITE_FIRESTORE_PRODUCTS_COLLECTION?: string
  readonly VITE_ADMIN_EMAILS?: string
  readonly VITE_IMAGEKIT_PUBLIC_KEY?: string
  readonly VITE_IMAGEKIT_URL_ENDPOINT?: string
  readonly VITE_IMAGEKIT_AUTH_ENDPOINT?: string
  readonly VITE_IMAGEKIT_FOLDER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
