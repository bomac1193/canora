export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-divider bg-muted/50">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="font-mono text-xs text-secondary">
            CANORA {currentYear}
          </p>
          <p className="text-xs text-secondary">
            A cultural decision system for the age of infinite generation
          </p>
        </div>
      </div>
    </footer>
  )
}
