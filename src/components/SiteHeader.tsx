"use client";

import { useState } from "react";
import { Logo } from "./Logo";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-dark/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm font-medium text-muted sm:flex">
          <a href="/temoignages" className="transition-colors hover:text-ink">
            Témoignages
          </a>
          <a href="/temoignages/nouveau" className="transition-colors hover:text-ink">
            Laisser un avis
          </a>
          <a
            href="https://insuffle.com"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-semibold text-white transition-all hover:bg-primary-light"
          >
            Passer à l&apos;action
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/5 hover:text-ink sm:hidden"
          aria-label="Menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {menuOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu drawer */}
      {menuOpen && (
        <div className="border-t border-line bg-dark/95 backdrop-blur-xl sm:hidden">
          <div className="mx-auto max-w-6xl space-y-1 px-4 pb-4 pt-2">
            <a href="/temoignages" className="block rounded-lg px-4 py-3 text-sm font-medium text-muted transition-colors hover:bg-white/5 hover:text-ink">
              Témoignages
            </a>
            <a href="/temoignages/nouveau" className="block rounded-lg px-4 py-3 text-sm font-medium text-muted transition-colors hover:bg-white/5 hover:text-ink">
              Laisser un avis
            </a>
            <a
              href="https://insuffle.com"
              className="mt-2 block rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-white transition-all hover:bg-primary-light"
            >
              Passer à l&apos;action →
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
