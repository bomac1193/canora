'use client'

import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { canCreate, canCurate, canManageRoles } from '@/lib/roles'

export function Header() {
  const { data: session, status } = useSession()

  return (
    <header className="border-b border-divider bg-background">
      <div className="mx-auto max-w-6xl px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Tagline */}
          <div className="flex items-baseline gap-6">
            <Link href="/" className="group">
              <h1 className="font-serif text-2xl font-semibold tracking-wide text-foreground">
                CANORA
              </h1>
            </Link>
            <span className="hidden text-sm text-secondary sm:inline">
              Remember everything. Choose the few.
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-6">
            <Link
              href="/canon"
              className="text-sm text-secondary transition-colors hover:text-foreground"
            >
              Canon Archive
            </Link>
            <Link
              href="/lineage"
              className="text-sm text-secondary transition-colors hover:text-foreground"
            >
              Lineage
            </Link>
            <Link
              href="/lists"
              className="text-sm text-secondary transition-colors hover:text-foreground"
            >
              Curated Lists
            </Link>

            {/* Authenticated Navigation */}
            {session?.user && (
              <>
                {canCreate(session.user.role) && (
                  <Link
                    href="/create"
                    className="text-sm text-secondary transition-colors hover:text-foreground"
                  >
                    Submit Work
                  </Link>
                )}
                {canCurate(session.user.role) && (
                  <Link
                    href="/curator"
                    className="text-sm text-secondary transition-colors hover:text-foreground"
                  >
                    Curator Desk
                  </Link>
                )}
                {canManageRoles(session.user.role) && (
                  <Link
                    href="/admin"
                    className="text-sm text-secondary transition-colors hover:text-foreground"
                  >
                    Admin
                  </Link>
                )}
              </>
            )}

            {/* Auth */}
            {status === 'loading' ? (
              <span className="text-sm text-secondary">...</span>
            ) : session?.user ? (
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs text-secondary">
                  {session.user.name || session.user.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  className="text-xs"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signIn()}
                className="text-xs"
              >
                Sign In
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
