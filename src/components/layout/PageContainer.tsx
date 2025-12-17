import { cn } from '@/lib/utils'

interface PageContainerProps {
  children: React.ReactNode
  className?: string
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <main className={cn('mx-auto max-w-6xl px-6 py-12', className)}>
      {children}
    </main>
  )
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="mb-12 border-b border-divider pb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-4xl font-semibold text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-secondary">{subtitle}</p>
          )}
        </div>
        {children && <div>{children}</div>}
      </div>
    </div>
  )
}

interface SectionProps {
  title?: string
  number?: number
  children: React.ReactNode
  className?: string
}

export function Section({ title, number, children, className }: SectionProps) {
  return (
    <section className={cn('mb-12', className)}>
      {(title || number !== undefined) && (
        <div className="mb-6 flex items-baseline gap-4 border-b border-divider pb-2">
          {number !== undefined && (
            <span className="font-mono text-xs text-secondary">
              {String(number).padStart(2, '0')}
            </span>
          )}
          {title && (
            <h2 className="font-serif text-xl font-medium text-foreground">
              {title}
            </h2>
          )}
        </div>
      )}
      {children}
    </section>
  )
}
