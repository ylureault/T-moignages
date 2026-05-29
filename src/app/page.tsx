import { getTemoignages } from "@/lib/db";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TestimonialCard } from "@/components/TestimonialCard";
import { Stars } from "@/components/Stars";

export const dynamic = "force-dynamic";

export default async function Home() {
  const allTemoignages = await getTemoignages();
  const temoignages = allTemoignages.filter((t) => t.publie !== false);
  const moyenne =
    temoignages.length > 0
      ? temoignages.reduce((s, t) => s + t.note, 0) / temoignages.length
      : 0;

  // 3 meilleurs témoignages récents (note 5) pour la vitrine.
  const vedettes = [...temoignages]
    .filter((t) => t.note === 5)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy">
        <div className="absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-3xl animate-float-slow" />
        <div className="absolute -bottom-48 -left-32 h-[28rem] w-[28rem] rounded-full bg-accent/10 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-6 py-24 text-center md:py-32">
          <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-medium text-white/80">
            <Stars note={Math.round(moyenne)} size={14} />
            {moyenne.toFixed(1)}/5 · {temoignages.length} avis
          </span>
          <h1 className="animate-fade-up delay-1 mx-auto mt-6 max-w-4xl font-display text-4xl font-bold leading-[1.05] text-white md:text-6xl lg:text-7xl">
            Assez de langue de bois.
            <br />
            <span className="accent-underline text-accent">Place aux résultats.</span>
          </h1>
          <p className="animate-fade-up delay-2 mx-auto mt-7 max-w-xl text-lg leading-relaxed text-white/70">
            Découvrez ce que vivent les dirigeants qui ont choisi de transformer
            la complexité en Clarté Vivante avec Insuffle.
          </p>
          <div className="animate-fade-up delay-3 mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/temoignages"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3.5 font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary-light"
            >
              Lire les témoignages
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a
              href="/temoignages/nouveau"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3.5 font-semibold text-white transition-all hover:bg-white/10"
            >
              Laisser un avis
            </a>
          </div>
        </div>
      </section>

      {/* Témoignages vedettes */}
      <main className="flex-1 bg-sand">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <span className="text-sm font-semibold uppercase tracking-wider text-accent">
                Ils témoignent
              </span>
              <h2 className="mt-2 font-display text-3xl font-bold text-ink md:text-4xl">
                Des mots qui pèsent
              </h2>
            </div>
            <a
              href="/temoignages"
              className="hidden items-center gap-1.5 text-sm font-semibold text-ink transition-colors hover:text-accent sm:inline-flex"
            >
              Tout voir
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vedettes.map((t, i) => (
              <div
                key={t.id}
                className="animate-fade-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <TestimonialCard t={t} />
              </div>
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
