import { useRef, useState, type DragEvent } from 'react'
import { imageUrl, isImageKitConfigured, uploadImage } from '@/lib/imagekit'

interface ImageFieldProps {
  value: string
  fileId?: string
  onChange: (url: string, fileId?: string) => void
}

const MAX_BYTES = 8 * 1024 * 1024

export function ImageField({ value, fileId, onChange }: ImageFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = async (file: File) => {
    setError(null)

    if (!file.type.startsWith('image/')) {
      setError('That file is not an image.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Images need to be under 8MB. Export it smaller and try again.')
      return
    }

    setProgress(0)
    try {
      const uploaded = await uploadImage(file, setProgress)
      onChange(uploaded.url, uploaded.fileId)
    } catch (failure) {
      setError((failure as Error).message)
    } finally {
      setProgress(null)
    }
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  return (
    <div>
      <p className="hud text-mocha">Image</p>

      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`mt-3 flex gap-4 border border-dashed p-4 transition-colors duration-300 ${
          dragging ? 'border-gold bg-gold/5' : 'border-ink/25'
        }`}
      >
        <div className="h-32 w-24 flex-none overflow-hidden bg-linen">
          {value ? (
            <img
              src={imageUrl(value, 200, 260)}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="hud text-mocha/60">None</span>
            </div>
          )}
        </div>

        <div className="flex-1">
          {isImageKitConfigured ? (
            <>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={progress !== null}
                className="hud border border-ink/25 px-4 py-2 transition-colors hover:border-gold disabled:opacity-50"
              >
                {progress === null ? 'Choose an image' : `Uploading ${progress}%`}
              </button>
              <p className="mt-2 text-xs text-mocha">
                Or drop a file here. Portrait works best, around 900×1200. Stored in ImageKit
                and resized on delivery.
              </p>
            </>
          ) : (
            <p className="text-xs text-mocha">
              ImageKit is not configured, so uploads are off. Paste an image URL below, or add
              the ImageKit keys to your environment.
            </p>
          )}

          {progress !== null ? (
            <span className="mt-3 block h-px w-full bg-ink/15">
              <span
                className="block h-px origin-left bg-gold transition-transform duration-200"
                style={{ transform: `scaleX(${progress / 100})` }}
              />
            </span>
          ) : null}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleFile(file)
              event.target.value = ''
            }}
          />

          <input
            type="url"
            value={value}
            onChange={(event) => onChange(event.target.value, undefined)}
            placeholder="https://ik.imagekit.io/…  or  /products/monarch.jpg"
            className="mt-3 w-full border-b border-ink/20 bg-transparent pb-1 font-mono text-xs text-ink placeholder:text-mocha/50 focus:border-gold focus:outline-none"
          />

          {fileId ? (
            <p className="hud mt-2 text-mocha/70">ImageKit id · {fileId}</p>
          ) : null}
          {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
        </div>
      </div>
    </div>
  )
}
