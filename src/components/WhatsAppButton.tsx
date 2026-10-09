const NUMBER = '14434687243'
const GREETING = 'Hi Calary Beauty, I saw your site and I have a question about'
const HREF = `https://wa.me/${NUMBER}?text=${encodeURIComponent(GREETING)}`

const ICON =
  'M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.29Z'

const LINK = 'group fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-noir text-porcelain shadow-[0_14px_40px_-12px_rgba(44,31,22,0.55)] transition-[transform,background-color] duration-500 ease-atelier hover:scale-105 hover:bg-gold md:bottom-8 md:right-8'

const LABEL = 'hud pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap bg-noir px-3 py-2 text-porcelain opacity-0 transition-opacity duration-500 ease-atelier group-hover:opacity-100 md:block'

export function WhatsAppButton() {
  return (
    <a href={HREF} target="_blank" rel="noopener noreferrer" className={LINK} aria-label="Message Calary Beauty on WhatsApp">
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7" aria-hidden="true"><path d={ICON} /></svg>
      <span className={LABEL}>Message the studio</span>
    </a>
  )
}
