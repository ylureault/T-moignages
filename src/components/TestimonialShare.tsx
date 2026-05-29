"use client";

import { useState } from "react";

export function TestimonialShare({ id }: { id: string }) {
  const [copied, setCopied] = useState<string | null>(null);

  function origin() {
    return typeof window !== "undefined" ? window.location.origin : "";
  }

  function copy(suffix: string, key: string) {
    const url = `${origin()}/temoignages/${id}${suffix}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const btn = "flex items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-white/80 transition-all hover:bg-white/5 hover:text-white";

  return (
    <div className="rounded-2xl border border-line bg-card p-5 sm:p-6">
      <p className="mb-1 text-sm font-semibold text-ink">Partager ce témoignage</p>
      <p className="mb-4 text-xs text-muted">Copiez un lien à partager partout, ou la version anonyme (initiales seulement).</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <button onClick={() => copy("", "normal")} className={btn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {copied === "normal" ? "Lien copié !" : "Lien public"}
        </button>
        <button onClick={() => copy("?anon=1", "anon")} className={btn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {copied === "anon" ? "Lien copié !" : "Lien anonyme"}
        </button>
        <a href={`/temoignages/${id}?mode=quote`} target="_blank" rel="noopener noreferrer" className={btn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 11H6a1 1 0 01-1-1V7a3 3 0 013-3M20 11h-4a1 1 0 01-1-1V7a3 3 0 013-3" />
          </svg>
          Mode citation
        </a>
        <a href={`/temoignages/${id}?mode=quote&anon=1`} target="_blank" rel="noopener noreferrer" className={btn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 11H6a1 1 0 01-1-1V7a3 3 0 013-3M20 11h-4a1 1 0 01-1-1V7a3 3 0 013-3" />
          </svg>
          Citation anonyme
        </a>
      </div>
    </div>
  );
}
