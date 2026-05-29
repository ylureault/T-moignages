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
      className="group flex h-full flex-col rounded-2xl border border-line bg-paper p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_20px_40px_-20px_rgba(21,23,28,0.25)]"
    >
      <div className="mb-4 flex items-center justify-between">
        <Stars note={t.note} />
        <SourceBadge source={t.source} verifie={t.verifie} />
      </div>

      <p className="mb-6 flex-1 text-[15px] leading-relaxed text-ink/85 line-clamp-5">
        “{t.contenu}”
      </p>

      <div className="flex items-center gap-3 border-t border-line pt-4">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-navy font-display text-sm font-semibold text-white">
          {initials(t.auteur)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{t.auteur}</p>
          <p className="truncate text-sm text-muted">
            {t.poste}
            {t.poste && t.entreprise ? " · " : ""}
            {t.entreprise}
          </p>
        </div>
      </div>
    </a>
  );
}
