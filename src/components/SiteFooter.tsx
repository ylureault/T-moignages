import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-sand">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Nous transformons la complexité en Clarté Vivante.
              Faisons bouger votre organisation.
            </p>
          </div>
          <div className="flex gap-8 text-sm sm:gap-12">
            <div className="flex flex-col gap-2.5">
              <span className="font-display font-semibold text-ink">Insuffle</span>
              <a href="https://insuffle.com" className="text-muted transition-colors hover:text-accent">Conseil</a>
              <a href="https://insuffle-academie.com" className="text-muted transition-colors hover:text-accent">Académie</a>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="font-display font-semibold text-ink">Avis</span>
              <a href="/temoignages" className="text-muted transition-colors hover:text-accent">Tous les témoignages</a>
              <a href="/temoignages/nouveau" className="text-muted transition-colors hover:text-accent">Laisser un avis</a>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-line pt-6 text-xs text-muted-soft sm:mt-10">
          © {new Date().getFullYear()} Insuffle — Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
