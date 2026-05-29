import { getTemoignages } from "@/lib/db";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TestimonialCard } from "@/components/TestimonialCard";
import { Stars } from "@/components/Stars";

export const dynamic = "force-dynamic";

export default async function TemoignagesPage({
  searchParams,
}: {
  searchParams: Promise<{ marque?: string }>;
}) {
  const { marque } = await searchParams;
  const allTemoignages = await getTemoignages();
  let temoignages = allTemoignages.filter((t) => t.publie !== false);

  if (marque === "insuffle" || marque === "academie") {
    temoignages = temoignages.filter((t) => t.marque === marque);
  }

  // Tri par date décroissante.
  temoignages.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const moyenne =
    temoignages.length > 0
      ? temoignages.reduce((s, t) => s + t.note, 0) / temoignages.length
      : 0;
  const tauxReco =
    temoignages.length > 0
      ? Math.round(
          (temoignages.filter((t) => t.recommande).length /
            temoignages.length) *
            100
        )
      : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy">
        <div className="absolute -right-32 -top-32 hidden h-96 w-96 rounded-full bg-accent/20 blur-3xl sm:block" />
        <div className="absolute -bottom-40 -left-20 hidden h-96 w-96 rounded-full bg-accent/10 blur-3xl sm:block" />
        <div className="relative mx-auto max-w-6xl px-4 py-14 text-center sm:px-6 md:py-24 lg:py-28">
          <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 sm:px-4 sm:text-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Ils ont fait bouger leur organisation
          </span>
          <h1 className="animate-fade-up delay-1 mx-auto mt-5 max-w-3xl font-display text-2xl font-bold leading-[1.1] text-white sm:mt-6 sm:text-4xl md:text-5xl lg:text-6xl">
            La parole à{" "}
            <span className="accent-underline text-accent">ceux qui osent</span>
          </h1>
          <p className="animate-fade-up delay-2 mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/70 sm:mt-6 sm:text-lg">
            Pas de langue de bois. Juste des dirigeants qui racontent ce qui a
            réellement changé.
          </p>

          {/* Stats */}
          <div className="animate-fade-up delay-3 mx-auto mt-8 grid max-w-2xl grid-cols-3 gap-2 sm:mt-12 sm:gap-4">
            <Stat value={moyenne.toFixed(1)} label="Note moyenne" sub={<Stars note={Math.round(moyenne)} size={14} />} />
            <Stat value={String(temoignages.length)} label="Témoignages" />
            <Stat value={`${tauxReco}%`} label="Recommandent" />
          </div>
        </div>
      </section>

      {/* Filtres marque */}
      <section className="border-b border-line bg-dark">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:px-6 sm:py-4">
          <FilterPill href="/temoignages" active={!marque} label="Tous" />
          <FilterPill href="/temoignages?marque=insuffle" active={marque === "insuffle"} label="Conseil" />
          <FilterPill href="/temoignages?marque=academie" active={marque === "academie"} label="Académie" />
        </div>
      </section>

      {/* Grille */}
      <main className="flex-1 bg-sand">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
          {temoignages.length === 0 ? (
            <p className="py-20 text-center text-muted">
              Aucun témoignage pour le moment.
            </p>
          ) : (
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {temoignages.map((t, i) => (
                <div
                  key={t.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${Math.min(i * 0.06, 0.5)}s` }}
                >
                  <TestimonialCard t={t} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Stat({
  value,
  label,
  sub,
}: {
  value: string;
  label: string;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm sm:rounded-2xl sm:px-4 sm:py-5">
      <div className="font-display text-xl font-bold text-white sm:text-3xl">{value}</div>
      {sub && <div className="mt-1 flex justify-center">{sub}</div>}
      <div className="mt-1 text-[10px] text-white/60 sm:text-xs">{label}</div>
    </div>
  );
}

function FilterPill({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <a
      href={href}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
        active
          ? "bg-primary text-white"
          : "text-muted hover:bg-sand-deep hover:text-ink"
      }`}
    >
      {label}
    </a>
  );
}
