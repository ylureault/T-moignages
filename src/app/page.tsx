export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Hero banner avec fond image en alpha */}
      <header className="relative min-h-[420px] flex items-center justify-center overflow-hidden">
        {/* Background image slot - upload your image to /public/hero-bg.jpg */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15"
          style={{ backgroundImage: "url('/hero-bg.jpg')" }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900/95 to-teal-950" />
        {/* Decorative blobs */}
        <div className="absolute top-[-30%] left-[-15%] w-[500px] h-[500px] bg-teal-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-40%] right-[-10%] w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px] animate-pulse" />
        {/* Content */}
        <div className="relative z-10 text-center px-6 py-16 max-w-3xl mx-auto animate-fade-in-up">
          {/* Logo Insuffle */}
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-teal-500/30">
              <span className="text-white font-black text-xl">I</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Insuffle
              </h2>
              <p className="text-xs text-teal-400 font-medium -mt-0.5">
                Boussole 4C
              </p>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">
              API Temoignages
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto mb-10">
            Gerez, consultez et sauvegardez les temoignages clients de la
            plateforme Boussole 4C. API securisee par cle,
            envoi Brevo integre.
          </p>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-2xl font-black text-teal-400">6</div>
              <div className="text-xs text-slate-400">Endpoints</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-2xl font-black text-teal-400">CRUD</div>
              <div className="text-xs text-slate-400">Complet</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-2xl font-black text-teal-400">
                <svg className="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="text-xs text-slate-400">Securise</div>
            </div>
          </div>
        </div>
      </header>

      {/* Endpoints section */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        {/* Lecture seule */}
        <section className="mb-16 animate-fade-in-up delay-100" style={{ opacity: 0, animationFillMode: "forwards", animationDelay: "100ms" }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold">Lecture publique</h2>
            <span className="px-3 py-1 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-lg">
              Sans cle API
            </span>
          </div>
          <div className="space-y-3">
            <EndpointCard
              method="GET"
              path="/api/temoignages"
              description="Liste paginee avec filtres (type, source, note_min, tag, verifie, q, sort, order, page, limit)"
            />
            <EndpointCard
              method="GET"
              path="/api/temoignages/:id"
              description="Detail complet d'un temoignage par son ID"
            />
            <EndpointCard
              method="GET"
              path="/api/types"
              description="Liste de toutes les categories de temoignages"
            />
          </div>
        </section>

        {/* Ecriture protegee */}
        <section className="mb-16 animate-fade-in-up delay-200" style={{ opacity: 0, animationFillMode: "forwards", animationDelay: "200ms" }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold">Ecriture protegee</h2>
            <span className="px-3 py-1 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-lg">
              Header x-api-key requis
            </span>
          </div>
          <div className="space-y-3">
            <EndpointCard
              method="POST"
              path="/api/temoignages"
              description="Creer un nouveau temoignage (auteur, contenu, type, note requis)"
              secured
            />
            <EndpointCard
              method="PUT"
              path="/api/temoignages/:id"
              description="Modifier un temoignage existant (merge partiel)"
              secured
            />
            <EndpointCard
              method="DELETE"
              path="/api/temoignages/:id"
              description="Supprimer un temoignage"
              secured
            />
            <EndpointCard
              method="POST"
              path="/api/types"
              description="Creer une nouvelle categorie (id, label requis)"
              secured
            />
            <EndpointCard
              method="PUT"
              path="/api/types/:id"
              description="Modifier une categorie"
              secured
            />
            <EndpointCard
              method="DELETE"
              path="/api/types/:id"
              description="Supprimer une categorie"
              secured
            />
          </div>
        </section>

        {/* Backup & Contact */}
        <section className="mb-16 animate-fade-in-up delay-300" style={{ opacity: 0, animationFillMode: "forwards", animationDelay: "300ms" }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold">Backup & Contact</h2>
            <span className="px-3 py-1 text-xs font-medium bg-violet-500/20 text-violet-400 rounded-lg">
              Services
            </span>
          </div>
          <div className="space-y-3">
            <EndpointCard
              method="GET"
              path="/api/backup"
              description="Telecharger un backup complet (temoignages + types) en JSON"
              secured
            />
            <EndpointCard
              method="POST"
              path="/api/backup"
              description="Restaurer depuis un fichier backup JSON"
              secured
            />
            <EndpointCard
              method="POST"
              path="/api/contact"
              description="Envoyer un message via Brevo (nom, email, message requis)"
            />
          </div>
        </section>

        {/* Configuration */}
        <section className="animate-fade-in-up delay-400" style={{ opacity: 0, animationFillMode: "forwards", animationDelay: "400ms" }}>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configuration
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Copiez <code className="px-2 py-0.5 bg-slate-700 rounded text-teal-400">.env.example</code> en{" "}
              <code className="px-2 py-0.5 bg-slate-700 rounded text-teal-400">.env.local</code> et remplissez les valeurs.
            </p>
            <div className="bg-slate-900/80 rounded-xl p-5 font-mono text-sm leading-loose overflow-x-auto">
              <div className="text-slate-500"># Protection des routes d&apos;ecriture</div>
              <div>
                <span className="text-teal-400">API_SECRET_KEY</span>
                <span className="text-slate-500">=</span>
                <span className="text-amber-300">votre-cle-secrete</span>
              </div>
              <div className="mt-3 text-slate-500"># Brevo (envoi emails)</div>
              <div>
                <span className="text-teal-400">BREVO_API_KEY</span>
                <span className="text-slate-500">=</span>
                <span className="text-amber-300">xkeysib-...</span>
              </div>
              <div>
                <span className="text-teal-400">BREVO_SENDER_EMAIL</span>
                <span className="text-slate-500">=</span>
                <span className="text-amber-300">noreply@insuffle.com</span>
              </div>
              <div>
                <span className="text-teal-400">CONTACT_EMAIL</span>
                <span className="text-slate-500">=</span>
                <span className="text-amber-300">contact@insuffle.com</span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-20 text-center text-sm text-slate-500 pb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-[10px]">I</span>
            </div>
            <span className="font-semibold text-slate-400">Insuffle</span>
          </div>
          Made with care by Insuffle &mdash; Boussole 4C
        </footer>
      </main>
    </div>
  );
}

function EndpointCard({
  method,
  path,
  description,
  secured,
}: {
  method: string;
  path: string;
  description: string;
  secured?: boolean;
}) {
  const methodColors: Record<string, string> = {
    GET: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    POST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    PUT: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <div className="group flex items-center gap-4 bg-slate-800/30 hover:bg-slate-800/60 border border-slate-700/50 hover:border-slate-600/50 rounded-xl px-5 py-4 transition-all duration-200">
      <span
        className={`px-3 py-1 text-xs font-bold rounded-lg border ${methodColors[method] || "bg-slate-500/20 text-slate-400"}`}
      >
        {method}
      </span>
      <code className="text-sm font-semibold text-white flex-shrink-0">
        {path}
      </code>
      <span className="text-sm text-slate-400 hidden md:inline">
        {description}
      </span>
      {secured && (
        <svg className="w-4 h-4 text-amber-400 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )}
    </div>
  );
}
