'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button'

const errorMessages: Record<string, string> = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'The verification link may have expired.',
  Default: 'An error occurred during authentication.',
}

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || 'Default'

  return (
    <PageContainer className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 h-12 w-12 border-2 border-canon" />
        <h1 className="font-serif text-3xl font-semibold">
          Authentication Error
        </h1>
        <p className="mt-4 text-secondary">
          {errorMessages[error] || errorMessages.Default}
        </p>
        <div className="mt-8">
          <Link href="/auth/signin">
            <Button>Try Again</Button>
          </Link>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Error code: {error}
        </p>
      </div>
    </PageContainer>
  )
}
