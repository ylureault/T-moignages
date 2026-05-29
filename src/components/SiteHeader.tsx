import { Logo } from "./Logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-dark/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo />
        <nav className="flex items-center gap-7 text-sm font-medium text-muted">
          <a href="/temoignages" className="hidden transition-colors hover:text-ink sm:inline">
            Témoignages
          </a>
          <a href="/temoignages/nouveau" className="hidden transition-colors hover:text-ink sm:inline">
            Laisser un avis
          </a>
          <a
            href="https://insuffle.com"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-semibold text-white transition-all hover:bg-primary-light"
          >
            Je passe à l&apos;action
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </nav>
      </div>
    </header>
  );
}
