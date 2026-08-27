import { Link } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { isConvexConfigured } from '@/lib/convex'

interface Viewer {
  email: string | null
  isAdmin: boolean
  allowlistConfigured: boolean
}

/**
 * A shop should not advertise its back door, so the dashboard is reachable two
 * ways: a quiet "Studio" link in the footer, and — only once an admin is
 * actually signed in — a pill in the nav so they can get back without typing
 * the URL.
 */
function DashboardPill({ className = '' }: { className?: string }) {
  const viewer = useQuery(api.products.viewer) as Viewer | null | undefined
  if (!viewer?.isAdmin) return null

  return (
    <Link
      to="/admin"
      className={`hud border border-gold/50 bg-gold/10 px-3 py-1.5 text-ink transition-colors duration-500 ease-atelier hover:border-gold ${className}`}
    >
      Dashboard
    </Link>
  )
}

export function AdminNavLink({ className = '' }: { className?: string }) {
  if (!isConvexConfigured) return null
  return <DashboardPill className={className} />
}

/** Always present, deliberately quiet. */
export function StudioFooterLink() {
  return (
    <Link
      to="/admin"
      className="hud text-porcelain/35 transition-colors hover:text-honey"
    >
      Studio login
    </Link>
  )
}
