import { useEffect } from 'react'

interface NoticeProps {
  message: string | null
  onDismiss: () => void
}

/** A single line of feedback, bottom centre. Says what happened, then leaves. */
export function Notice({ message, onDismiss }: NoticeProps) {
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(onDismiss, 4200)
    return () => window.clearTimeout(timer)
  }, [message, onDismiss])

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 bottom-8 z-[70] flex justify-center px-6 transition-all duration-500 ease-atelier ${
        message ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
    >
      {message ? (
        <p className="hud max-w-md border border-gold/40 bg-porcelain/95 px-5 py-3 text-center text-ink shadow-[0_10px_40px_-18px_rgba(44,31,22,0.5)] backdrop-blur">
          {message}
        </p>
      ) : null}
    </div>
  )
}
