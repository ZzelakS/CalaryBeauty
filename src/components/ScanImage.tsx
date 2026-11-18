interface ScanImageProps {
  src: string
  alt: string
  delay?: number
  duration?: number
  className?: string
}

/**
 * Product photos deliberately use native lazy loading only. The former scan
 * effect ran an animation-frame loop for every card entering the viewport,
 * making scrolling unstable on lower-powered devices.
 */
export function ScanImage({ src, alt, className = '' }: ScanImageProps) {
  return <div className={`scan-plate relative overflow-hidden ${className}`}>
    <img src={src} alt={alt} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
  </div>
}
