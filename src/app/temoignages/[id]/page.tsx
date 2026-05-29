import { notFound } from "next/navigation";
import { getTemoignages } from "@/lib/db";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Stars } from "@/components/Stars";
import { SourceBadge } from "@/components/SourceBadge";

export const dynamic = "force-dynamic";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default async function TemoignagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const temoignages = await getTemoignages();
  const t = temoignages.find((x) => x.id === id);
  if (!t) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Hero banner avec image de fond en alpha */}
      <section className="relative overflow-hidden bg-navy">
        {t.heroImage && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25"
            style={{ backgroundImage: `url('${t.heroImage}')` }}
            aria-hidden
          />
        )}
        {/* Voile dégradé pour garder la lisibilité par-dessus l'image */}
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/85 to-navy/55" />
        <div className="absolute -right-24 top-0 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative mx-auto max-w-3xl px-6 pb-16 pt-16 md:pt-20">
          <a
            href="/temoignages"
            className="animate-fade-up inline-flex items-center gap-2 text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Tous les témoignages
          </a>

          <div className="animate-fade-up delay-1 mt-8 flex items-center gap-3">
            <Stars note={t.note} size={22} />
            <span className="text-sm font-medium text-white/60">
              {t.note.toFixed(1)} / 5
            </span>
          </div>

          <blockquote className="animate-fade-up delay-2 mt-6 font-display text-2xl font-medium leading-snug text-white md:text-4xl md:leading-[1.2]">
            <span className="text-accent">“</span>
            {t.contenu}
            <span className="text-accent">”</span>
          </blockquote>
        </div>
      </section>

      {/* Auteur + détails */}
      <main className="flex-1 bg-sand">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <div className="-mt-20 rounded-2xl border border-line bg-paper p-6 shadow-[0_20px_50px_-30px_rgba(21,23,28,0.4)] md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-navy font-display text-lg font-semibold text-white">
                  {initials(t.auteur)}
                </span>
                <div>
                  <p className="font-display text-lg font-bold text-ink">{t.auteur}</p>
                  <p className="text-sm text-muted">
                    {t.poste}
                    {t.poste && t.entreprise ? " · " : ""}
                    {t.entreprise}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <SourceBadge source={t.source} verifie={t.verifie} />
                <span className="text-xs text-muted-soft">{formatDate(t.date)}</span>
              </div>
            </div>

            {t.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-6">
                {t.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-sand px-3 py-1 text-xs font-medium text-muted"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Réponse Insuffle */}
          {t.reponse && (
            <div className="animate-fade-up mt-6 rounded-2xl border-l-4 border-accent bg-paper p-6 md:p-8">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent font-display text-xs font-bold text-white">
                  I
                </span>
                <span className="font-display font-semibold text-ink">
                  Réponse d&apos;Insuffle
                </span>
                <span className="text-xs text-muted-soft">
                  · {formatDate(t.reponse.date)}
                </span>
              </div>
              <p className="leading-relaxed text-ink/80">{t.reponse.contenu}</p>
            </div>
          )}

          {/* CTA */}
          <div className="mt-10 rounded-2xl bg-ink p-8 text-center md:p-10">
            <h2 className="font-display text-2xl font-bold text-white md:text-3xl">
              Et si c&apos;était votre tour&nbsp;?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-white/70">
              On ne vend pas du temps, on vend du déblocage.
            </p>
            <a
              href="https://insuffle.com"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-accent-soft"
            >
              Je passe à l&apos;action
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
