import { notFound } from "next/navigation";
import { getTemoignages, getTypes, getEvenements } from "@/lib/db";
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
  if (!t || t.publie === false) notFound();

  const [types, evenements] = await Promise.all([getTypes(), getEvenements()]);
  const typeInfo = types.find((tp) => tp.id === t.type);
  const eventInfo = t.evenementId ? evenements.find((e) => e.id === t.evenementId) : null;

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

        <div className="relative mx-auto max-w-3xl px-4 pb-12 pt-12 sm:px-6 sm:pb-16 sm:pt-16 md:pt-20">
          <a
            href="/temoignages"
            className="animate-fade-up inline-flex items-center gap-2 text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Tous les témoignages
          </a>

          <div className="animate-fade-up delay-1 mt-6 flex items-center gap-3 sm:mt-8">
            <Stars note={t.note} size={22} />
            <span className="text-sm font-medium text-white/60">
              {t.note.toFixed(1)} / 5
            </span>
          </div>

          <blockquote className="animate-fade-up delay-2 mt-5 font-display text-lg font-medium leading-snug text-white sm:mt-6 sm:text-2xl md:text-4xl md:leading-[1.2]">
            <span className="text-accent">&ldquo;</span>
            {t.contenu}
            <span className="text-accent">&rdquo;</span>
          </blockquote>
        </div>
      </section>

      {/* Auteur + détails */}
      <main className="flex-1 bg-sand">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="-mt-16 rounded-2xl border border-line bg-card p-5 shadow-[0_20px_50px_-30px_rgba(21,23,28,0.4)] sm:-mt-20 sm:p-6 md:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-navy font-display text-base font-semibold text-white sm:h-14 sm:w-14 sm:text-lg">
                  {initials(t.auteur)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-bold text-ink sm:text-lg">{t.auteur}</p>
                  <p className="truncate text-sm text-muted">
                    {t.poste}
                    {t.poste && t.entreprise ? " · " : ""}
                    {t.entreprise}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                <SourceBadge source={t.source} verifie={t.verifie} />
                <span className="text-xs text-muted-soft">{formatDate(t.date)}</span>
              </div>
            </div>

            {t.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-6">
                {t.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-dark px-3 py-1 text-xs font-medium text-muted"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Contexte événement/type */}
          {(eventInfo || typeInfo) && (
            <div className="mt-6 flex flex-wrap gap-2">
              {eventInfo && (
                <span className="rounded-lg bg-primary/20 px-3 py-1.5 text-xs font-medium text-primary-light">
                  {eventInfo.nom}
                </span>
              )}
              {typeInfo && (
                <span className="rounded-lg px-3 py-1.5 text-xs font-medium" style={{ backgroundColor: typeInfo.color + "22", color: typeInfo.color }}>
                  {typeInfo.label}
                </span>
              )}
            </div>
          )}

          {/* Réponses personnalisées */}
          {t.champsPersonnalises && typeInfo?.champs && typeInfo.champs.length > 0 && (
            <div className="mt-6 space-y-4 rounded-2xl border border-line bg-dark/50 p-4 sm:p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-soft">Détail du retour</h3>
              {typeInfo.champs.map((champ) => {
                const val = t.champsPersonnalises?.[champ.id];
                if (val === undefined || val === null || val === "") return null;
                return (
                  <div key={champ.id}>
                    <p className="text-xs font-medium text-muted">{champ.label}</p>
                    {champ.type === "note" && typeof val === "number" ? (
                      <div className="mt-1"><Stars note={val} size={16} /></div>
                    ) : (
                      <p className="mt-1 text-sm text-ink/80">{String(val)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Réponse Insuffle */}
          {t.reponse && (
            <div className="animate-fade-up mt-6 rounded-2xl border-l-4 border-accent bg-card p-4 sm:p-6 md:p-8">
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
          <div className="mt-8 rounded-2xl bg-card p-6 text-center sm:mt-10 sm:p-8 md:p-10">
            <h2 className="font-display text-xl font-bold text-white sm:text-2xl md:text-3xl">
              Et si c&apos;était votre tour&nbsp;?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/70 sm:text-base">
              On ne vend pas du temps, on vend du déblocage.
            </p>
            <a
              href="https://insuffle.com"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary-light sm:mt-6 sm:w-auto"
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
