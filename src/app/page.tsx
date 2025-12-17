import Link from 'next/link'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <PageContainer className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      {/* Hero */}
      <div className="max-w-2xl">
        <h1 className="font-serif text-5xl font-semibold tracking-tight text-foreground md:text-6xl">
          CANORA
        </h1>
        <p className="mt-4 font-serif text-xl text-secondary">
          Remember everything. Choose the few.
        </p>

        <div className="mt-12 h-px w-24 bg-divider mx-auto" />

        <p className="mt-12 text-lg leading-relaxed text-secondary">
          A cultural decision system for the age of infinite AI generation.
          Not everything deserves attention. Most things should disappear.
          A few things should endure.
        </p>

        <p className="mt-8 text-secondary">
          CANORA preserves the full lineage of musical ideas while maintaining
          a rigorous, curator-driven process to elevate works to permanent Canon.
        </p>

        {/* Navigation */}
        <div className="mt-16 flex flex-col items-center gap-6">
          <div className="flex gap-4">
            <Link href="/canon">
              <Button variant="default" size="lg" className="font-mono text-sm">
                Enter Canon Archive
              </Button>
            </Link>
            <Link href="/lineage">
              <Button variant="outline" size="lg" className="font-mono text-sm">
                Explore Lineage
              </Button>
            </Link>
          </div>

          <Link
            href="/lists"
            className="text-sm text-secondary underline-offset-4 hover:text-foreground hover:underline"
          >
            View Curated Lists
          </Link>
        </div>
      </div>

      {/* Stats/Info */}
      <div className="mt-24 grid grid-cols-3 gap-8 border-t border-divider pt-12">
        <div className="text-center">
          <p className="font-mono text-3xl font-light text-foreground">JAM</p>
          <p className="mt-2 text-xs text-secondary">
            Raw submissions<br />under review
          </p>
        </div>
        <div className="text-center">
          <p className="font-mono text-3xl font-light text-foreground">PLATE</p>
          <p className="mt-2 text-xs text-secondary">
            Notable works<br />curator approved
          </p>
        </div>
        <div className="text-center">
          <p className="font-mono text-3xl font-light text-canon">CANON</p>
          <p className="mt-2 text-xs text-secondary">
            Permanent archive<br />irreversible
          </p>
        </div>
      </div>
    </PageContainer>
  )
}
