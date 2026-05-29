import type { Temoignage } from "@/types";
import { Stars } from "./Stars";
import { SourceBadge } from "./SourceBadge";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function TestimonialCard({ t }: { t: Temoignage }) {
  return (
    <a
      href={`/temoignages/${t.id}`}
      className="group flex h-full flex-col rounded-2xl border border-line bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_20px_40px_-20px_rgba(21,23,28,0.25)] sm:p-6"
    >
      <div className="mb-3 flex items-center justify-between sm:mb-4">
        <Stars note={t.note} />
        <SourceBadge source={t.source} verifie={t.verifie} />
      </div>

      <p className="mb-5 flex-1 text-sm leading-relaxed text-ink/85 line-clamp-5 sm:mb-6 sm:text-[15px]">
        &ldquo;{t.contenu}&rdquo;
      </p>

      <div className="flex items-center gap-3 border-t border-line pt-3 sm:pt-4">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-navy font-display text-xs font-semibold text-white sm:h-11 sm:w-11 sm:text-sm">
          {initials(t.auteur)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink sm:text-base">{t.auteur}</p>
          <p className="truncate text-xs text-muted sm:text-sm">
            {t.poste}
            {t.poste && t.entreprise ? " · " : ""}
            {t.entreprise}
          </p>
        </div>
      </div>
    </a>
  );
}
