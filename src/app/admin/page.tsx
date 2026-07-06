"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Temoignage, TypeTemoignage, Invitation, Evenement, ChampPersonnalise, NoteStyle, ModeleEmail } from "@/types";

type View = "dashboard" | "temoignages" | "types" | "evenements" | "invitations" | "modeles" | "api" | "backup";

/**
 * Résout les variables d'un modèle d'email avec les infos de l'invitation
 * et de son événement : {prenom} {nom} {entreprise} {evenement} {lien} {signature}.
 */
function resoudreVariables(texte: string, inv: Invitation, evt?: Evenement | null): string {
  const prenom = (inv.nom || "").trim().split(/\s+/)[0] || "";
  const lien = `${window.location.origin}/temoignages/nouveau?token=${inv.id}`;
  const signature = inv.marque === "academie"
    ? "Yoan Lureault — Insuffle Académie"
    : "Yoan Lureault — Insuffle";
  const intervenant = evt?.animateurs && evt.animateurs.length > 0 ? evt.animateurs.join(", ") : "";
  return texte
    .split("{prenom}").join(prenom)
    .split("{nom}").join(inv.nom || "")
    .split("{entreprise}").join(inv.entreprise || "votre entreprise")
    .split("{evenement}").join(evt?.nom || "notre collaboration")
    .split("{intervenant}").join(intervenant)
    .split("{lien}").join(lien)
    .split("{signature}").join(signature);
}

const SOURCES = ["google", "trustpilot", "linkedin", "site", "autre"] as const;
const MARQUES = ["insuffle", "academie"] as const;
const NOTE_STYLES: { value: NoteStyle; label: string }[] = [
  { value: "stars", label: "Étoiles" },
  { value: "smileys", label: "Smileys" },
  { value: "scale", label: "Échelle 1-10" },
  { value: "thumbs", label: "Pouces" },
];
const CHAMP_TYPES: ChampPersonnalise["type"][] = ["text", "textarea", "note", "select", "checkbox"];

function apiFetch(path: string, opts: RequestInit = {}) {
  return fetch(path, {
    ...opts,
    credentials: "include",
    headers: {
      ...(opts.headers || {}),
      ...(!opts.body || opts.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
    },
  }).then((res) => {
    if (typeof window !== "undefined") {
      // Session expirée/invalide → re-login (évite qu'une modif échoue en silence).
      if (res.status === 401) {
        window.dispatchEvent(new Event("admin-unauthorized"));
      }
      // Confirmation visuelle après une écriture réussie.
      const method = (opts.method || "GET").toUpperCase();
      const isMutation = method === "POST" || method === "PUT" || method === "DELETE";
      if (res.ok && isMutation && !path.startsWith("/api/auth")) {
        const label =
          method === "DELETE" ? "Supprimé"
          : path.includes("/api/upload") ? "Image téléversée"
          : "Enregistré";
        window.dispatchEvent(new CustomEvent("admin-toast", { detail: label }));
      }
    }
    return res;
  });
}

// ─── Icons (SVG paths from design spec) ───────────────────────
function Icon({ d, className = "w-5 h-5" }: { d: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  dashboard: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  document: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  inbox: "M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4",
  server: "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01",
  logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  plus: "M12 4v16m8-8H4",
  check: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  key: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",
  download: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
  upload: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
  close: "M6 18L18 6M6 6l12 12",
  star: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  chevronLeft: "M15 19l-7-7 7-7",
  chevronRight: "M9 5l7 7-7 7",
  menu: "M4 6h16M4 12h16M4 18h16",
  link: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
  mail: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  copy: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z",
  calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  eye: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  eyeOff: "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18",
  userAnon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  code: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
  qr: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM18 18h3v3h-3z",
  send: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8",
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (d.authenticated) setAuthenticated(true); setChecking(false); })
      .catch(() => setChecking(false));
  }, []);

  // Si une requête admin renvoie 401 (session expirée), on repasse en login.
  useEffect(() => {
    const onUnauthorized = () => { setAuthenticated(false); setAuthError("Session expirée, reconnectez-vous."); };
    window.addEventListener("admin-unauthorized", onUnauthorized);
    return () => window.removeEventListener("admin-unauthorized", onUnauthorized);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAuthenticated(true);
        setPassword("");
      } else {
        setAuthError(data.error || "Mot de passe incorrect");
      }
    } catch {
      setAuthError("Erreur de connexion");
    }
    setAuthLoading(false);
  }

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE", credentials: "include" });
    setAuthenticated(false);
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-teal-500/30 border-t-teal-500" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 sm:px-6">
        <form onSubmit={handleLogin} className="w-full max-w-md rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-600">
              <Icon d={ICONS.key} className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold">Administration</h1>
          </div>
          <label className="mb-2 block text-sm font-medium text-slate-300">Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none transition-all placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            placeholder="Votre mot de passe"
            autoFocus
          />
          {authError && (
            <p className="mb-4 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-300">{authError}</p>
          )}
          <button
            type="submit"
            disabled={authLoading || !password}
            className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:from-teal-400 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {authLoading ? "Vérification…" : "Connexion"}
          </button>
        </form>
      </div>
    );
  }

  return <AdminShell onLogout={handleLogout} />;
}

// ─── Admin Shell (post-auth) ──────────────────────────────────
function AdminShell({ onLogout }: { onLogout: () => void }) {
  const [view, setView] = useState<View>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Affiche une confirmation à chaque enregistrement (émis par apiFetch).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onToast = (e: Event) => {
      setToast((e as CustomEvent).detail || "Enregistré");
      clearTimeout(timer);
      timer = setTimeout(() => setToast(null), 2500);
    };
    window.addEventListener("admin-toast", onToast);
    return () => { window.removeEventListener("admin-toast", onToast); clearTimeout(timer); };
  }, []);

  const navItems: { id: View; label: string; icon: string }[] = [
    { id: "dashboard", label: "Tableau de bord", icon: ICONS.dashboard },
    { id: "temoignages", label: "Témoignages", icon: ICONS.document },
    { id: "types", label: "Types", icon: ICONS.inbox },
    { id: "evenements", label: "Événements", icon: ICONS.calendar },
    { id: "invitations", label: "Invitations", icon: ICONS.link },
    { id: "modeles", label: "Modèles d'email", icon: ICONS.mail },
    { id: "api", label: "API & Flux", icon: ICONS.code },
    { id: "backup", label: "Sauvegarde", icon: ICONS.server },
  ];

  function navigateTo(id: View) {
    setView(id);
    setMobileMenuOpen(false);
  }

  return (
    <div className="flex min-h-screen">
      {/* Toast de confirmation (enregistrements) */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 animate-fade-up">
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-2.5 text-sm font-medium text-emerald-300 shadow-lg backdrop-blur-md">
            <Icon d={ICONS.check} className="w-4 h-4" />
            {toast}
          </div>
        </div>
      )}

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-slate-800/50 bg-slate-900/95 px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 text-sm font-bold text-white">T</div>
          <span className="text-sm font-bold">Admin</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
          <Icon d={mobileMenuOpen ? ICONS.close : ICONS.menu} className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-y-0 left-0 w-72 border-r border-slate-800/50 bg-slate-900 pt-16" onClick={(e) => e.stopPropagation()}>
            <nav className="space-y-1 p-3">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 ${
                    view === item.id
                      ? "border border-teal-500/20 bg-gradient-to-r from-teal-500/20 to-teal-600/10 text-teal-400"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                  }`}
                >
                  <Icon d={item.icon} className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
            <div className="border-t border-slate-800/50 p-3">
              <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-400">
                <Icon d={ICONS.logout} className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={`${sidebarOpen ? "w-72" : "w-20"} hidden flex-col border-r border-slate-800/50 bg-slate-900/50 backdrop-blur-xl transition-all duration-300 ease-in-out md:flex`}>
        <div className="flex items-center gap-3 border-b border-slate-800/50 px-5 py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 font-bold text-white">
            T
          </div>
          {sidebarOpen && <span className="text-lg font-bold">Admin</span>}
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 ${
                view === item.id
                  ? "border border-teal-500/20 bg-gradient-to-r from-teal-500/20 to-teal-600/10 text-teal-400"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <Icon d={item.icon} className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" />
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="border-t border-slate-800/50 p-3 space-y-1">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-slate-400 transition-all hover:bg-slate-800/50 hover:text-white"
          >
            <Icon d={sidebarOpen ? ICONS.chevronLeft : ICONS.chevronRight} className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Réduire</span>}
          </button>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-400"
          >
            <Icon d={ICONS.logout} className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-4 pb-6 pt-16 md:p-8 md:pt-8">
        {view === "dashboard" && <DashboardView onNav={setView} />}
        {view === "temoignages" && <TemoignagesView />}
        {view === "types" && <TypesView />}
        {view === "evenements" && <EvenementsView />}
        {view === "invitations" && <InvitationsView />}
        {view === "modeles" && <ModelesView />}
        {view === "api" && <ApiView />}
        {view === "backup" && <BackupView />}
      </main>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────
function DashboardView({ onNav }: { onNav: (v: View) => void }) {
  const [temoignages, setTemoignages] = useState<Temoignage[]>([]);
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/temoignages?limit=100000").then((r) => r.json()),
      apiFetch("/api/evenements").then((r) => r.json()),
    ]).then(([td, ev]) => {
      setTemoignages(td.data || []);
      setEvenements(ev.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const avg = temoignages.length > 0 ? temoignages.reduce((s, t) => s + t.note, 0) / temoignages.length : 0;
  const verified = temoignages.filter((t) => t.verifie).length;
  const insuffle = temoignages.filter((t) => t.marque === "insuffle").length;
  const totalEvents = evenements.length;
  const activeEvents = evenements.filter((e) => e.actif).length;

  const stats = [
    { label: "Témoignages", value: temoignages.length, color: "blue" },
    { label: "Note moyenne", value: avg.toFixed(1) + "/5", color: "amber" },
    { label: "Vérifiés", value: verified, color: "teal" },
    { label: "Insuffle", value: insuffle, color: "purple" },
    { label: "Événements", value: totalEvents, color: "cyan" },
    { label: "Événements actifs", value: activeEvents, color: "emerald" },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/20 text-blue-400",
    amber: "bg-amber-500/20 text-amber-400",
    teal: "bg-teal-500/20 text-teal-400",
    purple: "bg-purple-500/20 text-purple-400",
    cyan: "bg-cyan-500/20 text-cyan-400",
    emerald: "bg-emerald-500/20 text-emerald-400",
  };

  const iconMap: Record<string, string> = {
    blue: ICONS.document,
    amber: ICONS.star,
    teal: ICONS.check,
    purple: ICONS.star,
    cyan: ICONS.calendar,
    emerald: ICONS.calendar,
  };

  const recent = [...temoignages].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold sm:text-3xl">Tableau de bord</h1>
        <p className="mt-1 text-sm text-slate-400">Vue d&apos;ensemble de vos témoignages</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorMap[s.color]}`}>
                <Icon d={iconMap[s.color] || ICONS.star} className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Derniers témoignages</h2>
          <button onClick={() => onNav("temoignages")} className="text-sm font-medium text-teal-400 transition-colors hover:text-teal-300">
            Tout voir →
          </button>
        </div>
        <div className="space-y-3">
          {recent.map((t) => (
            <a
              key={t.id}
              href={`/temoignages/${t.id}`}
              target="_blank"
              rel="noreferrer"
              title="Ouvrir la page du témoignage"
              className="flex cursor-pointer items-center gap-4 rounded-xl border border-slate-800/50 p-4 transition-colors hover:border-teal-500/30 hover:bg-slate-800/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-bold">
                {t.auteur.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t.auteur}</span>
                  <Stars note={t.note} />
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${t.marque === "academie" ? "bg-purple-500/20 text-purple-400" : "bg-teal-500/20 text-teal-400"}`}>
                    {t.marque}
                  </span>
                  {t.publie === false && (
                    <span className="rounded-lg bg-slate-700/50 px-2 py-0.5 text-xs font-medium text-slate-500">Non publié</span>
                  )}
                </div>
                <p className="truncate text-sm text-slate-400">{t.contenu}</p>
              </div>
              <span className="shrink-0 text-xs text-slate-500">{t.date}</span>
            </a>
          ))}
          {recent.length === 0 && <p className="text-sm text-slate-500">Aucun témoignage</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Témoignages CRUD ─────────────────────────────────────────
function TemoignagesView() {
  const [temoignages, setTemoignages] = useState<Temoignage[]>([]);
  const [types, setTypes] = useState<TypeTemoignage[]>([]);
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Temoignage | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMarque, setFilterMarque] = useState<string>("");
  const [filterAnimateur, setFilterAnimateur] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [socialFor, setSocialFor] = useState<Temoignage | null>(null);
  const [importing, setImporting] = useState(false);
  const [showArchives, setShowArchives] = useState(false);

  const loadData = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    Promise.all([
      fetch(`/api/temoignages?limit=100000${showArchives ? "&archives=1" : ""}`).then((r) => r.json()),
      fetch("/api/types").then((r) => r.json()),
      apiFetch("/api/evenements").then((r) => r.json()),
    ]).then(([td, tp, ev]) => {
      setTemoignages(td.data || []);
      setTypes(tp.data || []);
      setEvenements(ev.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [showArchives]);

  useEffect(() => { loadData(); }, [loadData]);

  // Liste des intervenants présents sur des témoignages (pour le filtre).
  const animateursDispo = Array.from(
    new Set(temoignages.map((t) => t.animateur).filter((a): a is string => !!a))
  ).sort();

  const filtered = temoignages.filter((t) => {
    if (filterMarque && t.marque !== filterMarque) return false;
    if (filterAnimateur && (t.animateur || "") !== filterAnimateur) return false;
    if (search) {
      const s = search.toLowerCase();
      return t.auteur.toLowerCase().includes(s) || t.entreprise.toLowerCase().includes(s) || t.contenu.toLowerCase().includes(s);
    }
    return true;
  });

  /** Archive (jamais de suppression physique) : restaurable depuis la vue Archivés. */
  async function handleArchive(id: string) {
    const res = await apiFetch(`/api/temoignages/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTemoignages((prev) => prev.filter((t) => t.id !== id));
      setDeleteId(null);
    }
  }

  async function handleRestore(t: Temoignage) {
    const res = await apiFetch(`/api/temoignages/${t.id}`, {
      method: "PUT",
      body: JSON.stringify({ archive: false }),
    });
    if (res.ok) setTemoignages((prev) => prev.filter((x) => x.id !== t.id));
  }

  async function togglePublie(t: Temoignage) {
    const res = await apiFetch(`/api/temoignages/${t.id}`, {
      method: "PUT",
      body: JSON.stringify({ publie: t.publie === false }),
    });
    if (res.ok) loadData();
  }

  // Reste sur le formulaire après enregistrement (préférence : ne pas
  // renvoyer à la liste). Rechargement silencieux, et après une création on
  // bascule en mode édition pour que les sauvegardes suivantes soient des PUT.
  async function handleSave(data: Record<string, unknown>): Promise<boolean> {
    setSaving(true);
    setError("");
    try {
      const isEdit = !!editing;
      const url = isEdit ? `/api/temoignages/${editing!.id}` : "/api/temoignages";
      const method = isEdit ? "PUT" : "POST";
      const res = await apiFetch(url, { method, body: JSON.stringify(data) });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Erreur");
        setSaving(false);
        return false;
      }
      if (!isEdit && result.data) { setEditing(result.data); setCreating(false); }
      loadData(true);
      setSaving(false);
      return true;
    } catch {
      setError("Erreur de connexion");
      setSaving(false);
      return false;
    }
  }

  if (loading) return <Loader />;

  if (creating || editing) {
    return (
      <TemoignageForm
        initial={editing}
        types={types}
        evenements={evenements}
        saving={saving}
        error={error}
        onSave={handleSave}
        onCancel={() => { setEditing(null); setCreating(false); setError(""); }}
      />
    );
  }

  const evtMap = Object.fromEntries(evenements.map((e) => [e.id, e]));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold sm:text-3xl">Témoignages</h1>
          <p className="mt-1 text-sm text-slate-400">{temoignages.length} témoignage{temoignages.length > 1 ? "s" : ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setImporting(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-5 py-2.5 font-semibold text-slate-300 transition-all hover:border-teal-500/40 hover:text-teal-400"
          >
            <Icon d={ICONS.upload} className="w-4 h-4" />
            Importer
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:from-teal-400 hover:to-cyan-400"
          >
            <Icon d={ICONS.plus} className="w-4 h-4" />
            Nouveau
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Icon d={ICONS.search} className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/50 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            placeholder="Rechercher…"
          />
        </div>
        <select
          value={filterMarque}
          onChange={(e) => setFilterMarque(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-sm text-white outline-none focus:border-teal-500"
        >
          <option value="">Toutes les marques</option>
          <option value="insuffle">Insuffle</option>
          <option value="academie">Académie</option>
        </select>
        {animateursDispo.length > 0 && (
          <select
            value={filterAnimateur}
            onChange={(e) => setFilterAnimateur(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-sm text-white outline-none focus:border-teal-500"
          >
            <option value="">Tous les intervenants</option>
            {animateursDispo.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
        <button
          onClick={() => setShowArchives(!showArchives)}
          className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
            showArchives
              ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
              : "border-slate-700 bg-slate-900/50 text-slate-400 hover:text-white"
          }`}
          title="Les témoignages archivés ne sont jamais supprimés : ils restent restaurables ici"
        >
          {showArchives ? "← Retour aux témoignages" : "Archivés"}
        </button>
      </div>

      {showArchives && (
        <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-300/90">
          Archives : rien n&apos;est jamais supprimé. Un témoignage archivé est retiré de partout
          mais reste stocké — cliquez « Restaurer » pour le récupérer.
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="px-2 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400 sm:px-4 sm:py-3">Auteur</th>
              <th className="px-2 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400 sm:px-4 sm:py-3">Note</th>
              <th className="hidden px-2 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400 sm:px-4 sm:py-3 md:table-cell">Marque</th>
              <th className="hidden px-2 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400 sm:px-4 sm:py-3 lg:table-cell">Source</th>
              <th className="hidden px-2 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400 sm:px-4 sm:py-3 lg:table-cell">Vérifié</th>
              <th className="hidden px-2 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400 sm:px-4 sm:py-3 xl:table-cell">Événement</th>
              <th className="px-2 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400 sm:px-4 sm:py-3">Date</th>
              <th className="px-2 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400 sm:px-4 sm:py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-slate-800/50 transition-colors hover:bg-slate-800/30">
                <td className="px-2 py-3 sm:px-4 sm:py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold">
                      {t.auteur.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{t.auteur}</p>
                      <p className="truncate text-xs text-slate-500">{t.entreprise}</p>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-3 sm:px-4 sm:py-4"><Stars note={t.note} /></td>
                <td className="hidden px-2 py-3 sm:px-4 sm:py-4 md:table-cell">
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${t.marque === "academie" ? "bg-purple-500/20 text-purple-400" : "bg-teal-500/20 text-teal-400"}`}>
                    {t.marque}
                  </span>
                </td>
                <td className="hidden px-2 py-3 sm:px-4 sm:py-4 text-sm text-slate-400 lg:table-cell">{t.source}</td>
                <td className="hidden px-2 py-3 sm:px-4 sm:py-4 lg:table-cell">
                  {t.verifie
                    ? <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400">Oui</span>
                    : <span className="rounded-lg bg-slate-700/50 px-2.5 py-1 text-xs font-medium text-slate-500">Non</span>
                  }
                </td>
                <td className="hidden px-2 py-3 sm:px-4 sm:py-4 xl:table-cell">
                  {t.evenementId && evtMap[t.evenementId] ? (
                    <div className="flex flex-col items-start gap-1">
                      <span className="rounded-lg bg-cyan-500/20 px-2.5 py-1 text-xs font-medium text-cyan-400">
                        {evtMap[t.evenementId].nom}
                      </span>
                      {t.animateur && (
                        <span className="rounded-lg bg-slate-700/40 px-2.5 py-1 text-xs font-medium text-slate-300">{t.animateur}</span>
                      )}
                    </div>
                  ) : t.animateur ? (
                    <span className="rounded-lg bg-slate-700/40 px-2.5 py-1 text-xs font-medium text-slate-300">{t.animateur}</span>
                  ) : (
                    <span className="text-xs text-slate-600">—</span>
                  )}
                </td>
                <td className="px-2 py-3 sm:px-4 sm:py-4 text-sm text-slate-400">{t.date}</td>
                <td className="px-2 py-3 sm:px-4 sm:py-4">
                  <div className="flex items-center gap-1">
                    {showArchives ? (
                      <button
                        onClick={() => handleRestore(t)}
                        className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25"
                      >
                        Restaurer
                      </button>
                    ) : (
                      <>
                        <button onClick={() => setSocialFor(t)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-teal-400" title="Voir le témoignage complet & formats réseaux sociaux">
                          <Icon d={ICONS.eye} className="w-4 h-4" />
                        </button>
                        <button onClick={() => togglePublie(t)} className={`rounded-lg p-2 transition-colors ${t.publie === false ? "text-slate-500 hover:bg-emerald-500/10 hover:text-emerald-400" : "text-emerald-400 hover:bg-slate-700/50 hover:text-slate-400"}`} title={t.publie === false ? "Publier" : "Masquer"}>
                          <Icon d={t.publie === false ? ICONS.eyeOff : ICONS.eye} className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditing(t)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white" title="Modifier">
                          <Icon d={ICONS.edit} className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(t.id)} className="rounded-lg p-2 text-slate-400 transition-all hover:bg-amber-500/10 hover:text-amber-400" title="Archiver (jamais supprimé, restaurable)">
                          <Icon d={ICONS.trash} className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">Aucun témoignage trouvé</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation d'archivage (jamais de suppression) */}
      {deleteId && (
        <Modal onClose={() => setDeleteId(null)}>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
              <Icon d={ICONS.trash} className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Archiver ce témoignage ?</h3>
            <p className="mb-6 text-sm text-slate-400">
              Il sera retiré de partout mais <strong className="text-slate-300">jamais supprimé</strong> —
              restaurable à tout moment depuis la vue « Archivés ».
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteId(null)} className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700">
                Annuler
              </button>
              <button onClick={() => handleArchive(deleteId)} className="rounded-xl bg-amber-500/20 px-5 py-2.5 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/30">
                Archiver
              </button>
            </div>
          </div>
        </Modal>
      )}

      {socialFor && <SocialModal t={socialFor} onClose={() => setSocialFor(null)} />}
      {importing && <ImportModal onClose={() => { setImporting(false); loadData(); }} />}
    </div>
  );
}

// ─── Modal d'import de témoignages externes (JSON / CSV) ──────
function ImportModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /** CSV → tableau d'objets. Colonnes reconnues : auteur, entreprise, poste,
   *  note, contenu, date, source, marque, type. Séparateur , ou ; détecté. */
  function parseCsv(raw: string): Record<string, unknown>[] {
    const lines = raw.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const sep = (lines[0].match(/;/g)?.length || 0) > (lines[0].match(/,/g)?.length || 0) ? ";" : ",";
    const splitLine = (line: string): string[] => {
      const cells: string[] = [];
      let cur = "", inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
          else inQuotes = !inQuotes;
        } else if (c === sep && !inQuotes) { cells.push(cur); cur = ""; }
        else cur += c;
      }
      cells.push(cur);
      return cells.map((s) => s.trim());
    };
    const headers = splitLine(lines[0]).map((h) => h.toLowerCase());
    return lines.slice(1).map((line) => {
      const cells = splitLine(line);
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => { if (cells[i] !== undefined && cells[i] !== "") obj[h] = cells[i]; });
      if (typeof obj.note === "string") obj.note = parseFloat(obj.note as string);
      return obj;
    });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setText(await file.text());
  }

  async function handleImport() {
    setBusy(true);
    setResult(null);
    try {
      const trimmed = text.trim();
      let payload: unknown;
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        payload = JSON.parse(trimmed);
      } else {
        const rows = parseCsv(trimmed);
        if (rows.length === 0) {
          setResult({ ok: false, message: "CSV vide ou illisible (1re ligne = en-têtes : auteur, contenu, note, …)" });
          setBusy(false);
          return;
        }
        payload = rows;
      }
      const res = await apiFetch("/api/temoignages/importer", { method: "POST", body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: data.error || "Erreur lors de l'import" });
      } else {
        setResult({ ok: true, message: data.message });
        if (data.erreurs?.length > 0) {
          setResult({ ok: true, message: `${data.message} — 1re erreur : ligne ${data.erreurs[0].index + 1} (${data.erreurs[0].erreur})` });
        }
      }
    } catch {
      setResult({ ok: false, message: "Contenu illisible : JSON ou CSV attendu" });
    }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700/50 bg-slate-800 p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Importer des témoignages</h3>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white">
            <Icon d={ICONS.close} className="w-5 h-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-400">
          Fichier ou collage <strong>JSON</strong> (tableau ou export backup) ou <strong>CSV</strong> (en-têtes : <code className="text-teal-400">auteur, contenu, note</code> + optionnels <code className="text-teal-400">entreprise, poste, date, source, marque, type</code>).
          Fusion sans risque : les témoignages déjà présents ne sont jamais écrasés, rien n&apos;est supprimé. Les imports arrivent <strong>non publiés</strong> pour relecture.
        </p>

        <input ref={fileRef} type="file" accept=".json,.csv,.txt" onChange={handleFile} className="mb-3 text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-300 hover:file:bg-slate-700" />

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-900/50 p-3 font-mono text-xs text-white outline-none placeholder:text-slate-600 focus:border-teal-500"
          placeholder={'[\n  { "auteur": "Marie Dupont", "entreprise": "Acme", "note": 5, "contenu": "Excellent accompagnement…" }\n]\n\nou CSV :\nauteur;entreprise;note;contenu\nMarie Dupont;Acme;5;Excellent accompagnement'}
        />

        {result && (
          <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${result.ok ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
            {result.message}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700">
            {result?.ok ? "Fermer" : "Annuler"}
          </button>
          <button
            onClick={handleImport}
            disabled={busy || !text.trim()}
            className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:from-teal-400 hover:to-cyan-400 disabled:opacity-50"
          >
            {busy ? "Import en cours…" : "Importer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal "Voir complet" + formats réseaux sociaux ───────────
function SocialModal({ t, onClose }: { t: Temoignage; onClose: () => void }) {
  const [nameMode, setNameMode] = useState<"full" | "initial" | "first">("full");
  const [format, setFormat] = useState<"square" | "story" | "landscape">("square");
  const [copied, setCopied] = useState(false);

  const prenom = t.auteur.trim().split(/\s+/)[0] || "";
  const nomInit = (t.auteur.trim().split(/\s+/)[1] || "").charAt(0).toUpperCase();
  const displayName = nameMode === "first" ? prenom : nameMode === "initial" ? (nomInit ? `${prenom} ${nomInit}.` : prenom) : t.auteur;

  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/temoignages/${t.id}?mode=quote&format=${format}&name=${nameMode}`;

  function copy() {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  const nameOpts: { v: typeof nameMode; label: string }[] = [
    { v: "full", label: "Nom complet" },
    { v: "initial", label: "Prénom + initiale" },
    { v: "first", label: "Prénom seul" },
  ];
  const fmtOpts: { v: typeof format; label: string; ratio: string }[] = [
    { v: "square", label: "Carré (post)", ratio: "1:1" },
    { v: "story", label: "Story", ratio: "9:16" },
    { v: "landscape", label: "Paysage", ratio: "16:9" },
  ];

  const aspect = format === "square" ? "aspect-square" : format === "story" ? "aspect-[9/16] max-w-[220px] mx-auto" : "aspect-[16/9]";
  const academie = t.marque === "academie";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700/50 bg-slate-800 p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Aperçu & partage réseaux sociaux</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white"><Icon d={ICONS.close} className="w-5 h-5" /></button>
        </div>

        {/* Aperçu live */}
        <div className="mb-5 rounded-xl bg-slate-950 p-4">
          <div className={`relative mx-auto flex ${aspect} ${academie ? "theme-academie" : ""} flex-col items-center justify-center overflow-hidden rounded-2xl bg-navy px-5 py-6 text-center`}>
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/20 blur-2xl" />
            <div className="relative">
              <div className="mb-2 flex justify-center"><Stars note={t.note} /></div>
              <p className={`font-display font-semibold leading-snug text-white ${format === "landscape" ? "text-sm sm:text-base line-clamp-4" : "text-sm line-clamp-6"}`}>
                <span className="text-accent">&ldquo;</span>{t.contenu}<span className="text-accent">&rdquo;</span>
              </p>
              <p className="mt-3 text-xs font-bold text-white">{displayName}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/40">{academie ? "Insuffle Académie" : "Insuffle"}</p>
            </div>
          </div>
        </div>

        {/* Affichage du nom */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Affichage du nom</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {nameOpts.map((o) => (
            <button key={o.v} onClick={() => setNameMode(o.v)} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${nameMode === o.v ? "bg-teal-500/20 text-teal-300 ring-1 ring-teal-500/40" : "bg-slate-900/50 text-slate-400 hover:text-white"}`}>{o.label}</button>
          ))}
        </div>

        {/* Format */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Format</p>
        <div className="mb-5 flex flex-wrap gap-2">
          {fmtOpts.map((o) => (
            <button key={o.v} onClick={() => setFormat(o.v)} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${format === o.v ? "bg-teal-500/20 text-teal-300 ring-1 ring-teal-500/40" : "bg-slate-900/50 text-slate-400 hover:text-white"}`}>{o.label} <span className="text-xs opacity-60">{o.ratio}</span></button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:from-teal-400 hover:to-cyan-400">
            <Icon d={ICONS.eye} className="w-4 h-4" /> Ouvrir en plein écran (capture d&apos;écran)
          </a>
          <button onClick={copy} className="flex items-center gap-2 rounded-xl bg-slate-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-600">
            <Icon d={copied ? ICONS.check : ICONS.copy} className="w-4 h-4" /> {copied ? "Lien copié !" : "Copier le lien"}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">Ouvre la carte au format choisi, puis fais une capture d&apos;écran pour la publier. Le lien est aussi partageable tel quel.</p>
      </div>
    </div>
  );
}

// ─── Témoignage Form ──────────────────────────────────────────
function TemoignageForm({
  initial,
  types,
  evenements,
  saving,
  error,
  onSave,
  onCancel,
}: {
  initial: Temoignage | null;
  types: TypeTemoignage[];
  evenements: Evenement[];
  saving: boolean;
  error: string;
  onSave: (data: Record<string, unknown>) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [justSaved, setJustSaved] = useState(false);
  const [savedOnce, setSavedOnce] = useState(!!initial);
  const [form, setForm] = useState({
    auteur: initial?.auteur || "",
    entreprise: initial?.entreprise || "",
    poste: initial?.poste || "",
    avatar: initial?.avatar || "",
    note: initial?.note || 5,
    contenu: initial?.contenu || "",
    type: initial?.type || (types[0]?.id ?? ""),
    tags: initial?.tags?.join(", ") || "",
    source: initial?.source || "site",
    marque: initial?.marque || "insuffle",
    verifie: initial?.verifie ?? false,
    recommande: initial?.recommande ?? true,
    publie: initial?.publie ?? true,
    date: initial?.date || new Date().toISOString().split("T")[0],
    heroImage: initial?.heroImage || "",
    reponseAuteur: initial?.reponse?.auteur || "",
    reponseContenu: initial?.reponse?.contenu || "",
    reponseDate: initial?.reponse?.date || "",
    evenementId: initial?.evenementId || "",
    animateur: initial?.animateur || "",
  });
  const [uploading, setUploading] = useState(false);
  // Intervenants proposés = ceux de l'événement lié (c'est l'admin qui choisit).
  const evtAnimateurs = evenements.find((e) => e.id === form.evenementId)?.animateurs || [];

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: Record<string, unknown> = {
      auteur: form.auteur,
      entreprise: form.entreprise,
      poste: form.poste,
      avatar: form.avatar,
      note: Number(form.note),
      contenu: form.contenu,
      type: form.type,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      source: form.source,
      marque: form.marque,
      verifie: form.verifie,
      recommande: form.recommande,
      publie: form.publie,
      date: form.date,
    };
    if (form.heroImage) data.heroImage = form.heroImage;
    if (form.evenementId) data.evenementId = form.evenementId;
    data.animateur = form.animateur || "";
    if (form.reponseContenu) {
      data.reponse = {
        auteur: form.reponseAuteur || "Insuffle",
        contenu: form.reponseContenu,
        date: form.reponseDate || new Date().toISOString().split("T")[0],
      };
    } else {
      data.reponse = null;
    }
    const ok = await onSave(data);
    if (ok) {
      setSavedOnce(true);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>, field: "avatar" | "heroImage") {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", field === "avatar" ? "avatars" : "heroes");
    try {
      const res = await apiFetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.data?.url) {
        setForm((f) => ({ ...f, [field]: data.data.url }));
      }
    } catch { /* ignore */ }
    setUploading(false);
  }

  const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none transition-all placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";
  const labelClass = "mb-2 block text-sm font-medium text-slate-300";

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <button onClick={onCancel} className="rounded-xl bg-slate-800/50 p-2.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
          <Icon d={ICONS.chevronLeft} className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold sm:text-3xl">{initial ? "Modifier" : "Nouveau"} témoignage</h1>
          <p className="mt-1 text-sm text-slate-400">{initial ? `Édition de ${initial.auteur}` : "Créer un nouveau témoignage"}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm md:p-8">
        {/* Identity */}
        <fieldset>
          <legend className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Identité</legend>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Nom *</label>
              <input required value={form.auteur} onChange={update("auteur")} className={inputClass} placeholder="Marie Dupont" />
            </div>
            <div>
              <label className={labelClass}>Entreprise</label>
              <input value={form.entreprise} onChange={update("entreprise")} className={inputClass} placeholder="Acme Inc." />
            </div>
            <div>
              <label className={labelClass}>Poste</label>
              <input value={form.poste} onChange={update("poste")} className={inputClass} placeholder="Directrice" />
            </div>
            <div>
              <label className={labelClass}>Date</label>
              <input type="date" value={form.date} onChange={update("date")} className={inputClass} />
            </div>
          </div>
        </fieldset>

        {/* Content */}
        <fieldset>
          <legend className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Contenu</legend>
          <div>
            <label className={labelClass}>Témoignage *</label>
            <textarea required value={form.contenu} onChange={update("contenu")} rows={5} className={`${inputClass} resize-none`} placeholder="Le contenu du témoignage…" />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label className={labelClass}>Note</label>
              <select value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: Number(e.target.value) }))} className={inputClass}>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} étoile{n > 1 ? "s" : ""}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Type</label>
              <select value={form.type} onChange={update("type")} className={inputClass}>
                {types.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Source</label>
              <select value={form.source} onChange={update("source")} className={inputClass}>
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label className={labelClass}>Marque</label>
              <select value={form.marque} onChange={update("marque")} className={inputClass}>
                {MARQUES.map((m) => <option key={m} value={m}>{m === "insuffle" ? "Insuffle (Conseil)" : "Académie (Formations)"}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Tags (séparés par des virgules)</label>
              <input value={form.tags} onChange={update("tags")} className={inputClass} placeholder="leadership, transformation" />
            </div>
            <div>
              <label className={labelClass}>Événement (optionnel)</label>
              <select value={form.evenementId} onChange={(e) => { update("evenementId")(e); setForm((f) => ({ ...f, animateur: "" })); }} className={inputClass}>
                <option value="">— Aucun —</option>
                {evenements.map((ev) => <option key={ev.id} value={ev.id}>{ev.nom}</option>)}
              </select>
            </div>
            {evtAnimateurs.length > 0 && (
              <div>
                <label className={labelClass}>Intervenant concerné</label>
                <select value={form.animateur} onChange={update("animateur")} className={inputClass}>
                  <option value="">— Non précisé —</option>
                  {evtAnimateurs.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <p className="mt-1 text-xs text-slate-500">Le facilitateur / formateur que ce témoignage concerne.</p>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={form.verifie} onChange={update("verifie")} className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-teal-500 focus:ring-teal-500/20" />
              Vérifié
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={form.recommande} onChange={update("recommande")} className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-teal-500 focus:ring-teal-500/20" />
              Recommande
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={form.publie} onChange={update("publie")} className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-teal-500 focus:ring-teal-500/20" />
              Publié (visible)
            </label>
          </div>
        </fieldset>

        {/* Images */}
        <fieldset>
          <legend className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Images</legend>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Avatar</label>
              <div className="flex items-center gap-3">
                <input value={form.avatar} onChange={update("avatar")} className={`${inputClass} flex-1`} placeholder="URL ou upload" />
                <label className="cursor-pointer rounded-xl bg-slate-800 px-3 py-3 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white">
                  <Icon d={ICONS.upload} className="w-4 h-4" />
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => handleImageUpload(e, "avatar")} />
                </label>
              </div>
              {form.avatar && <img src={form.avatar} alt="" className="mt-2 h-12 w-12 rounded-full object-cover" />}
            </div>
            <div>
              <label className={labelClass}>Image Hero</label>
              <div className="flex items-center gap-3">
                <input value={form.heroImage} onChange={update("heroImage")} className={`${inputClass} flex-1`} placeholder="URL ou upload" />
                <label className="cursor-pointer rounded-xl bg-slate-800 px-3 py-3 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white">
                  <Icon d={ICONS.upload} className="w-4 h-4" />
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => handleImageUpload(e, "heroImage")} />
                </label>
              </div>
              {form.heroImage && <img src={form.heroImage} alt="" className="mt-2 h-20 w-full rounded-xl object-cover" />}
            </div>
          </div>
          {uploading && <p className="mt-2 text-sm text-teal-400">Upload en cours…</p>}
        </fieldset>

        {/* Response */}
        <fieldset>
          <legend className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Réponse d&apos;Insuffle (optionnel)</legend>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Auteur réponse</label>
              <input value={form.reponseAuteur} onChange={update("reponseAuteur")} className={inputClass} placeholder="Insuffle" />
            </div>
            <div>
              <label className={labelClass}>Date réponse</label>
              <input type="date" value={form.reponseDate} onChange={update("reponseDate")} className={inputClass} />
            </div>
          </div>
          <div className="mt-4">
            <label className={labelClass}>Contenu réponse</label>
            <textarea value={form.reponseContenu} onChange={update("reponseContenu")} rows={3} className={`${inputClass} resize-none`} placeholder="Votre réponse au témoignage…" />
          </div>
        </fieldset>

        {/* Custom fields (read-only display when editing) */}
        {initial?.champsPersonnalises && Object.keys(initial.champsPersonnalises).length > 0 && (
          <fieldset>
            <legend className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Champs personnalisés (lecture seule)</legend>
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(initial.champsPersonnalises).map(([key, value]) => (
                <div key={key}>
                  <label className={labelClass}>{key}</label>
                  <div className="w-full rounded-xl border border-slate-700/50 bg-slate-900/30 px-4 py-3 text-slate-400">
                    {typeof value === "boolean" ? (value ? "Oui" : "Non") : String(value ?? "—")}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
        )}

        {error && <p className="rounded-xl bg-red-500/20 px-4 py-3 text-sm font-medium text-red-300">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:from-teal-400 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : savedOnce ? "Mettre à jour" : "Créer"}
          </button>
          <button type="button" onClick={onCancel} className="rounded-xl bg-slate-800/50 px-5 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
            {savedOnce ? "Retour à la liste" : "Annuler"}
          </button>
          {justSaved && (
            <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-sm font-medium text-emerald-400">
              <Icon d={ICONS.check} className="w-4 h-4" />Enregistré
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

// ─── Types CRUD ───────────────────────────────────────────────
function TypesView() {
  const [types, setTypes] = useState<TypeTemoignage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TypeTemoignage | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function copyFormLink(typeId: string) {
    const url = `${window.location.origin}/temoignages/nouveau?type=${typeId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(typeId);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  // `silent` : rafraîchit les données SANS passer par l'état loading.
  // Indispensable pendant qu'un formulaire est ouvert : sinon le Loader
  // remplace (démonte) le formulaire en plein enregistrement et le remonte
  // avec les anciennes valeurs — les modifications semblent perdues.
  const loadTypes = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    fetch("/api/types").then((r) => r.json()).then((d) => {
      setTypes(d.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadTypes(); }, [loadTypes]);

  async function handleDelete(id: string) {
    const res = await apiFetch(`/api/types/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTypes((prev) => prev.filter((t) => t.id !== id));
      setDeleteId(null);
    }
  }

  if (loading) return <Loader />;

  if (creating || editing) {
    return <TypeForm initial={editing} onSaved={() => loadTypes(true)} onClose={() => { setEditing(null); setCreating(false); loadTypes(); }} />;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold sm:text-3xl">Types</h1>
          <p className="mt-1 text-sm text-slate-400">{types.length} catégorie{types.length > 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:from-teal-400 hover:to-cyan-400">
          <Icon d={ICONS.plus} className="w-4 h-4" />
          Nouveau type
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {types.map((t) => (
          <div key={t.id} className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm transition-all hover:border-teal-500/20">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl text-lg" style={{ backgroundColor: t.color + "33", color: t.color }}>
                {t.icon === "star" ? "★" : t.icon.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold">{t.label}</h3>
                <p className="text-xs text-slate-500">{t.id}</p>
              </div>
            </div>
            <p className="mb-4 text-sm text-slate-400">{t.description || "Pas de description"}</p>
            <div className="mb-3 rounded-lg bg-slate-900/50 px-3 py-2">
              <p className="mb-1 text-xs text-slate-500">Lien du formulaire client</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate text-xs text-teal-400">/temoignages/nouveau?type={t.id}</code>
                <button
                  onClick={() => copyFormLink(t.id)}
                  className="shrink-0 rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-400 transition-colors hover:text-teal-400"
                >
                  {copied === t.id ? "Copié !" : "Copier"}
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(t)} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-white">
                Modifier
              </button>
              <button onClick={() => setDeleteId(t.id)} className="rounded-lg px-3 py-1.5 text-xs text-red-400 transition-all hover:bg-red-500/10">
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      {deleteId && (
        <Modal onClose={() => setDeleteId(null)}>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
              <Icon d={ICONS.trash} className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Supprimer ce type ?</h3>
            <p className="mb-6 text-sm text-slate-400">Les témoignages associés ne seront pas supprimés.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteId(null)} className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700">
                Annuler
              </button>
              <button onClick={() => handleDelete(deleteId)} className="rounded-xl bg-red-500/20 px-5 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30">
                Supprimer
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Type Form ────────────────────────────────────────────────
function TypeForm({ initial, onSaved, onClose }: { initial: TypeTemoignage | null; onSaved: () => void; onClose: () => void }) {
  const [form, setForm] = useState({
    id: initial?.id || "",
    label: initial?.label || "",
    description: initial?.description || "",
    icon: initial?.icon || "star",
    color: initial?.color || "#14b8a6",
    noteStyle: (initial?.noteStyle || "stars") as NoteStyle,
  });
  const [champs, setChamps] = useState<ChampPersonnalise[]>(initial?.champs || []);
  const [showNewChamp, setShowNewChamp] = useState(false);
  const [editingChampId, setEditingChampId] = useState<string | null>(null);
  const [newChamp, setNewChamp] = useState<{
    id: string;
    label: string;
    type: ChampPersonnalise["type"];
    required: boolean;
    placeholder: string;
    options: string;
  }>({ id: "", label: "", type: "text", required: false, placeholder: "", options: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedOnce, setSavedOnce] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function resetChampForm() {
    setNewChamp({ id: "", label: "", type: "text", required: false, placeholder: "", options: "" });
    setShowNewChamp(false);
    setEditingChampId(null);
  }

  function addChamp() {
    if (!newChamp.id || !newChamp.label) return;
    const champ: ChampPersonnalise = {
      id: newChamp.id,
      label: newChamp.label,
      type: newChamp.type,
      required: newChamp.required,
      placeholder: newChamp.placeholder || undefined,
      options: newChamp.type === "select" && newChamp.options
        ? newChamp.options.split(",").map((o) => o.trim()).filter(Boolean)
        : undefined,
    };
    if (editingChampId) {
      // Remplace le champ existant en conservant sa position.
      setChamps((prev) => prev.map((c) => (c.id === editingChampId ? champ : c)));
    } else {
      // Empêche les doublons d'ID.
      if (champs.some((c) => c.id === champ.id)) {
        setError(`Un champ avec l'ID "${champ.id}" existe déjà.`);
        return;
      }
      setChamps((prev) => [...prev, champ]);
    }
    setError("");
    resetChampForm();
  }

  function editChamp(champ: ChampPersonnalise) {
    setEditingChampId(champ.id);
    setNewChamp({
      id: champ.id,
      label: champ.label,
      type: champ.type,
      required: !!champ.required,
      placeholder: champ.placeholder || "",
      options: champ.options ? champ.options.join(", ") : "",
    });
    setShowNewChamp(true);
  }

  function moveChamp(index: number, dir: -1 | 1) {
    setChamps((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeChamp(id: string) {
    setChamps((prev) => prev.filter((c) => c.id !== id));
    if (editingChampId === id) resetChampForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const isEdit = !!initial || savedOnce;
    const url = isEdit ? `/api/types/${form.id}` : "/api/types";
    const method = isEdit ? "PUT" : "POST";
    const payload = { ...form, champs };
    try {
      const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        setSaving(false);
        return;
      }
      setSavedOnce(true);
      setSaving(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
      onSaved();
    } catch {
      setError("Erreur de connexion");
      setSaving(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none transition-all placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";
  const labelClass = "mb-2 block text-sm font-medium text-slate-300";

  const champTypeBadge: Record<string, string> = {
    text: "bg-blue-500/20 text-blue-400",
    textarea: "bg-indigo-500/20 text-indigo-400",
    note: "bg-amber-500/20 text-amber-400",
    select: "bg-purple-500/20 text-purple-400",
    checkbox: "bg-emerald-500/20 text-emerald-400",
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <button onClick={onClose} className="rounded-xl bg-slate-800/50 p-2.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white" title="Retour à la liste">
          <Icon d={ICONS.chevronLeft} className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold sm:text-3xl">{initial || savedOnce ? "Modifier" : "Nouveau"} type</h1>
        {justSaved && <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-sm font-medium text-emerald-400"><Icon d={ICONS.check} className="w-4 h-4" />Enregistré</span>}
      </div>
      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm md:p-8">
        {/* Basic info */}
        <fieldset>
          <legend className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Informations de base</legend>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>ID *</label>
              <input required value={form.id} onChange={update("id")} disabled={!!initial || savedOnce} className={`${inputClass} disabled:cursor-not-allowed disabled:text-slate-400`} placeholder="mon-type" />
            </div>
            <div>
              <label className={labelClass}>Label *</label>
              <input required value={form.label} onChange={update("label")} className={inputClass} placeholder="Mon type" />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea value={form.description} onChange={update("description")} rows={3} className={`${inputClass} resize-none`} placeholder="Description du type" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Icône</label>
                <input value={form.icon} onChange={update("icon")} className={inputClass} placeholder="star" />
              </div>
              <div>
                <label className={labelClass}>Couleur</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.color} onChange={update("color")} className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent" />
                  <input value={form.color} onChange={update("color")} className={inputClass} />
                </div>
              </div>
            </div>
          </div>
        </fieldset>

        {/* Note style */}
        <fieldset>
          <legend className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Style de notation</legend>
          <div>
            <label className={labelClass}>Style de la note</label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {NOTE_STYLES.map((ns) => (
                <button
                  key={ns.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, noteStyle: ns.value }))}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                    form.noteStyle === ns.value
                      ? "border-teal-500/50 bg-teal-500/20 text-teal-400"
                      : "border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-600 hover:text-white"
                  }`}
                >
                  {ns.label}
                </button>
              ))}
            </div>
          </div>
        </fieldset>

        {/* Custom fields builder */}
        <fieldset>
          <legend className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Champs personnalisés</legend>

          {/* Existing fields */}
          {champs.length > 0 && (
            <div className="mb-4 space-y-3">
              {champs.map((champ, index) => (
                <div key={champ.id} className={`flex items-start justify-between gap-3 rounded-xl border p-4 ${editingChampId === champ.id ? "border-teal-500/50 bg-teal-500/5" : "border-slate-700/50 bg-slate-900/30"}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white">{champ.label}</span>
                      <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${champTypeBadge[champ.type] || "bg-slate-700 text-slate-400"}`}>
                        {champ.type}
                      </span>
                      {champ.required && (
                        <span className="rounded-lg bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
                          Requis
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">ID: {champ.id}</p>
                    {champ.placeholder && <p className="mt-0.5 text-xs text-slate-500">Placeholder: {champ.placeholder}</p>}
                    {champ.type === "select" && champ.options && champ.options.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {champ.options.map((opt) => (
                          <span key={opt} className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                            {opt}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => moveChamp(index, -1)} disabled={index === 0} className="rounded-lg p-2 text-slate-500 transition-all hover:bg-slate-700/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-30" title="Monter">
                      <Icon d={ICONS.chevronLeft} className="w-4 h-4 rotate-90" />
                    </button>
                    <button type="button" onClick={() => moveChamp(index, 1)} disabled={index === champs.length - 1} className="rounded-lg p-2 text-slate-500 transition-all hover:bg-slate-700/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-30" title="Descendre">
                      <Icon d={ICONS.chevronLeft} className="w-4 h-4 -rotate-90" />
                    </button>
                    <button type="button" onClick={() => editChamp(champ)} className="rounded-lg p-2 text-slate-500 transition-all hover:bg-teal-500/10 hover:text-teal-400" title="Modifier le champ">
                      <Icon d={ICONS.edit} className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => removeChamp(champ.id)} className="rounded-lg p-2 text-slate-500 transition-all hover:bg-red-500/10 hover:text-red-400" title="Supprimer le champ">
                      <Icon d={ICONS.trash} className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {champs.length === 0 && !showNewChamp && (
            <p className="mb-4 text-sm text-slate-500">Aucun champ personnalisé. Les utilisateurs verront uniquement les champs par défaut.</p>
          )}

          {/* Add new field form */}
          {showNewChamp ? (
            <div className="rounded-xl border border-teal-500/30 bg-slate-900/50 p-4">
              <h4 className="mb-3 text-sm font-semibold text-teal-400">{editingChampId ? "Modifier le champ" : "Nouveau champ"}</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">ID *</label>
                  <input
                    value={newChamp.id}
                    onChange={(e) => setNewChamp((c) => ({ ...c, id: e.target.value }))}
                    disabled={!!editingChampId}
                    className={`${inputClass} disabled:cursor-not-allowed disabled:text-slate-500`}
                    placeholder="mon-champ"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Label *</label>
                  <input
                    value={newChamp.label}
                    onChange={(e) => setNewChamp((c) => ({ ...c, label: e.target.value }))}
                    className={inputClass}
                    placeholder="Mon champ"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Type</label>
                  <select
                    value={newChamp.type}
                    onChange={(e) => setNewChamp((c) => ({ ...c, type: e.target.value as ChampPersonnalise["type"] }))}
                    className={inputClass}
                  >
                    {CHAMP_TYPES.map((ct) => (
                      <option key={ct} value={ct}>{ct}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Placeholder</label>
                  <input
                    value={newChamp.placeholder}
                    onChange={(e) => setNewChamp((c) => ({ ...c, placeholder: e.target.value }))}
                    className={inputClass}
                    placeholder="Texte indicatif…"
                  />
                </div>
              </div>
              {newChamp.type === "select" && (
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-medium text-slate-400">Options (séparées par des virgules)</label>
                  <input
                    value={newChamp.options}
                    onChange={(e) => setNewChamp((c) => ({ ...c, options: e.target.value }))}
                    className={inputClass}
                    placeholder="Option 1, Option 2, Option 3"
                  />
                </div>
              )}
              <div className="mt-3 flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={newChamp.required}
                    onChange={(e) => setNewChamp((c) => ({ ...c, required: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-teal-500 focus:ring-teal-500/20"
                  />
                  Requis
                </label>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={addChamp}
                  disabled={!newChamp.id || !newChamp.label}
                  className="rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:from-teal-400 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {editingChampId ? "Enregistrer le champ" : "Ajouter"}
                </button>
                <button
                  type="button"
                  onClick={resetChampForm}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNewChamp(true)}
              className="flex items-center gap-2 rounded-xl border border-dashed border-slate-600 px-4 py-3 text-sm font-medium text-slate-400 transition-all hover:border-teal-500/50 hover:text-teal-400"
            >
              <Icon d={ICONS.plus} className="w-4 h-4" />
              Ajouter un champ
            </button>
          )}
        </fieldset>

        {error && <p className="rounded-xl bg-red-500/20 px-4 py-3 text-sm font-medium text-red-300">{error}</p>}
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:from-teal-400 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? "Enregistrement…" : initial || savedOnce ? "Mettre à jour" : "Créer"}
          </button>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800/50 px-5 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
            Retour à la liste
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Événements CRUD ──────────────────────────────────────────
function EvenementsView() {
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [types, setTypes] = useState<TypeTemoignage[]>([]);
  const [temoignages, setTemoignages] = useState<Temoignage[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Evenement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [quickLinkBusy, setQuickLinkBusy] = useState<string | null>(null);
  const [qrFor, setQrFor] = useState<Evenement | null>(null);

  // `silent` : voir loadTypes — ne jamais démonter un formulaire ouvert.
  const loadData = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    Promise.all([
      apiFetch("/api/evenements").then((r) => r.json()),
      fetch("/api/types").then((r) => r.json()),
      fetch("/api/temoignages?limit=100000").then((r) => r.json()),
    ]).then(([ev, tp, tm]) => {
      setEvenements(ev.data || []);
      setTypes(tp.data || []);
      setTemoignages(tm.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function copyLink(evtId: string) {
    const url = `${window.location.origin}/temoignages/nouveau?event=${evtId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(evtId);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function shareLink(evt: Evenement) {
    const url = `${window.location.origin}/temoignages/nouveau?event=${evt.id}`;
    const subject = encodeURIComponent(`Partagez votre avis — ${evt.nom}`);
    const body = encodeURIComponent(
      `Bonjour,\n\n${evt.description || "Nous aimerions recueillir votre témoignage sur cet événement."}\n\nCliquez ici pour partager votre avis :\n${url}\n\nMerci !\nL'équipe ${evt.marque === "academie" ? "Académie" : "Insuffle"}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  /**
   * Lien unique en 1 clic : crée une invitation héritant de l'événement
   * (client, type, marque) et copie immédiatement l'URL personnelle dans le
   * presse-papier. Chaque lien est à usage unique — parfait pour l'envoyer
   * rapidement à un client précis.
   */
  async function quickUniqueLink(evt: Evenement) {
    setQuickLinkBusy(evt.id);
    try {
      const res = await apiFetch("/api/invitations", {
        method: "POST",
        body: JSON.stringify({
          nom: "",
          email: "",
          entreprise: evt.entreprise || "",
          type: evt.typeId,
          marque: evt.marque,
          evenementId: evt.id,
          message: "",
        }),
      });
      const data = await res.json();
      if (res.ok && data.data?.id) {
        const url = `${window.location.origin}/temoignages/nouveau?token=${data.data.id}`;
        await navigator.clipboard.writeText(url).catch(() => {});
        window.dispatchEvent(new CustomEvent("admin-toast", { detail: "Lien unique créé et copié — prêt à envoyer" }));
      }
    } finally {
      setQuickLinkBusy(null);
    }
  }

  async function handleDelete(id: string) {
    const res = await apiFetch(`/api/evenements/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEvenements((prev) => prev.filter((e) => e.id !== id));
      setDeleteId(null);
    }
  }

  async function toggleActive(evt: Evenement) {
    const res = await apiFetch(`/api/evenements/${evt.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...evt, actif: !evt.actif }),
    });
    if (res.ok) {
      setEvenements((prev) => prev.map((e) => e.id === evt.id ? { ...e, actif: !e.actif } : e));
    }
  }

  if (loading) return <Loader />;

  if (creating || editing) {
    return (
      <EvenementForm
        initial={editing}
        types={types}
        onSaved={() => loadData(true)}
        onClose={() => { setEditing(null); setCreating(false); loadData(); }}
      />
    );
  }

  const typeMap = Object.fromEntries(types.map((t) => [t.id, t]));

  function countTemoignages(evtId: string) {
    return temoignages.filter((t) => t.evenementId === evtId).length;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold sm:text-3xl">Événements</h1>
          <p className="mt-1 text-sm text-slate-400">{evenements.length} événement{evenements.length > 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:from-teal-400 hover:to-cyan-400"
        >
          <Icon d={ICONS.plus} className="w-4 h-4" />
          Nouvel événement
        </button>
      </div>

      {evenements.length === 0 ? (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-12 text-center backdrop-blur-sm">
          <Icon d={ICONS.calendar} className="mx-auto mb-4 w-12 h-12 text-slate-600" />
          <p className="text-slate-400">Aucun événement. Créez-en un pour recueillir des témoignages liés.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {evenements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((evt) => {
            const t = typeMap[evt.typeId];
            const count = countTemoignages(evt.id);
            return (
              <div key={evt.id} className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm transition-all hover:border-teal-500/20">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-white">{evt.nom}</h3>
                    {evt.entreprise && (
                      <p className="mt-0.5 flex items-center gap-1 text-sm font-medium text-teal-400">
                        <Icon d={ICONS.userAnon} className="w-3.5 h-3.5" />
                        {evt.entreprise}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-slate-500">{evt.id}</p>
                  </div>
                  <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium ${evt.actif ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700/50 text-slate-500"}`}>
                    {evt.actif ? "Actif" : "Inactif"}
                  </span>
                </div>

                {evt.description && <p className="mb-3 text-sm text-slate-400 line-clamp-2">{evt.description}</p>}

                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {t && (
                    <span className="rounded-lg px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: t.color + "33", color: t.color }}>
                      {t.label}
                    </span>
                  )}
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${evt.marque === "academie" ? "bg-purple-500/20 text-purple-400" : "bg-teal-500/20 text-teal-400"}`}>
                    {evt.marque}
                  </span>
                  <span className="rounded-lg bg-blue-500/20 px-2.5 py-1 text-xs font-medium text-blue-400">
                    {count} témoignage{count > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>{new Date(evt.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
                  {evt.lieu && <span>{evt.lieu}</span>}
                </div>

                {evt.animateurs && evt.animateurs.length > 0 && (
                  <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-slate-500">{evt.marque === "academie" ? "Formateur" : "Facilitateur"}{evt.animateurs.length > 1 ? "s" : ""} :</span>
                    {evt.animateurs.map((a) => (
                      <span key={a} className="rounded-md bg-slate-700/40 px-2 py-0.5 text-xs font-medium text-slate-300">{a}</span>
                    ))}
                  </div>
                )}

                {/* Link */}
                <div className="mb-3 rounded-lg bg-slate-900/50 px-3 py-2">
                  <p className="mb-1 text-xs text-slate-500">Lien de l&apos;événement</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate text-xs text-teal-400">/temoignages/nouveau?event={evt.id}</code>
                    <button
                      onClick={() => copyLink(evt.id)}
                      className="shrink-0 rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-400 transition-colors hover:text-teal-400"
                    >
                      {copied === evt.id ? "Copié !" : "Copier"}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => quickUniqueLink(evt)}
                    disabled={quickLinkBusy === evt.id}
                    className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 px-3 py-1.5 text-xs font-semibold text-white shadow shadow-teal-500/30 transition-all hover:from-teal-400 hover:to-cyan-400 disabled:opacity-50"
                    title="Crée un lien personnel à usage unique et le copie — prêt à envoyer à un client"
                  >
                    <Icon d={ICONS.link} className="w-3 h-3" />
                    {quickLinkBusy === evt.id ? "Création…" : "Lien unique"}
                  </button>
                  <button onClick={() => setEditing(evt)} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-white">
                    Modifier
                  </button>
                  <button onClick={() => toggleActive(evt)} className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${evt.actif ? "text-amber-400 hover:bg-amber-500/10" : "text-emerald-400 hover:bg-emerald-500/10"}`}>
                    {evt.actif ? "Désactiver" : "Activer"}
                  </button>
                  <button
                    onClick={() => shareLink(evt)}
                    className="flex items-center gap-1 rounded-lg bg-teal-500/20 px-3 py-1.5 text-xs text-teal-400 transition-colors hover:bg-teal-500/30"
                  >
                    <Icon d={ICONS.mail} className="w-3 h-3" />
                    Email
                  </button>
                  <button
                    onClick={() => setQrFor(evt)}
                    className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-teal-400"
                    title="QR code à projeter ou imprimer — les participants scannent et témoignent sur place"
                  >
                    <Icon d={ICONS.qr} className="w-3 h-3" />
                    QR code
                  </button>
                  <button onClick={() => setDeleteId(evt.id)} className="rounded-lg px-3 py-1.5 text-xs text-red-400 transition-all hover:bg-red-500/10">
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteId && (
        <Modal onClose={() => setDeleteId(null)}>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
              <Icon d={ICONS.trash} className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Supprimer cet événement ?</h3>
            <p className="mb-6 text-sm text-slate-400">Les témoignages associés ne seront pas supprimés.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteId(null)} className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700">
                Annuler
              </button>
              <button onClick={() => handleDelete(deleteId)} className="rounded-xl bg-red-500/20 px-5 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30">
                Supprimer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {qrFor && <QrModal evt={qrFor} onClose={() => setQrFor(null)} />}
    </div>
  );
}

// ─── QR code d'un événement (collecte sur place) ──────────────
function QrModal({ evt, onClose }: { evt: Evenement; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState("");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const url = `${window.location.origin}/temoignages/nouveau?event=${evt.id}`;

  useEffect(() => {
    // Généré côté client, aucune donnée n'est envoyée à un service externe.
    import("qrcode")
      .then((QR) => QR.toDataURL(url, { width: 640, margin: 2, color: { dark: "#0f172a", light: "#ffffff" } }))
      .then(setDataUrl)
      .catch(() => {});
  }, [url]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-slate-700/50 bg-slate-800 p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-1 text-lg font-semibold">{evt.nom}</h3>
        <p className="mb-4 text-xs text-slate-500">
          À projeter en fin de séance ou imprimer : les participants scannent et témoignent sur place.
        </p>
        {dataUrl ? (
          <img src={dataUrl} alt={`QR code — ${evt.nom}`} className="mx-auto mb-4 w-56 rounded-xl bg-white p-2" />
        ) : (
          <div className="mx-auto mb-4 flex h-56 w-56 items-center justify-center rounded-xl bg-slate-900/50 text-xs text-slate-500">
            Génération…
          </div>
        )}
        <div className="flex justify-center gap-2">
          {dataUrl && (
            <a
              href={dataUrl}
              download={`qr-temoignages-${evt.id}.png`}
              className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:from-teal-400 hover:to-cyan-400"
            >
              Télécharger le PNG
            </a>
          )}
          <button
            onClick={() => navigator.clipboard.writeText(url).then(() => { setCopiedUrl(true); setTimeout(() => setCopiedUrl(false), 2000); })}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
          >
            {copiedUrl ? "Copié !" : "Copier le lien"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Événement Form ───────────────────────────────────────────
function EvenementForm({
  initial,
  types,
  onSaved,
  onClose,
}: {
  initial: Evenement | null;
  types: TypeTemoignage[];
  onSaved: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    nom: initial?.nom || "",
    description: initial?.description || "",
    typeId: initial?.typeId || (types[0]?.id ?? ""),
    entreprise: initial?.entreprise || "",
    bannerImage: initial?.bannerImage || "",
    date: initial?.date || new Date().toISOString().split("T")[0],
    lieu: initial?.lieu || "",
    marque: initial?.marque || "insuffle",
    actif: initial?.actif ?? true,
  });
  const [animateurs, setAnimateurs] = useState<string[]>(initial?.animateurs || []);
  const [animateurInput, setAnimateurInput] = useState("");
  const [uploading, setUploading] = useState(false);

  // Libellé contextuel : Insuffle = facilitateur, Académie = formateur.
  const intervenantLabel = form.marque === "academie" ? "Formateur" : "Facilitateur";

  function addAnimateur() {
    const v = animateurInput.trim();
    if (v && !animateurs.some((a) => a.toLowerCase() === v.toLowerCase())) {
      setAnimateurs((prev) => [...prev, v]);
    }
    setAnimateurInput("");
  }
  function removeAnimateur(name: string) {
    setAnimateurs((prev) => prev.filter((a) => a !== name));
  }
  const [savedId, setSavedId] = useState<string | null>(initial?.id || null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState("");

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const isEdit = !!savedId;
    const url = isEdit ? `/api/evenements/${savedId}` : "/api/evenements";
    const method = isEdit ? "PUT" : "POST";
    // Inclut la saisie en cours non validée par Entrée, pour ne rien perdre.
    const pending = animateurInput.trim();
    const animateursFinal = pending && !animateurs.some((a) => a.toLowerCase() === pending.toLowerCase())
      ? [...animateurs, pending]
      : animateurs;
    try {
      const res = await apiFetch(url, { method, body: JSON.stringify({ ...form, animateurs: animateursFinal }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erreur"); setSaving(false); return; }
      if (data.data?.id) setSavedId(data.data.id);
      setSaving(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
      onSaved();
    } catch {
      setError("Erreur de connexion");
      setSaving(false);
    }
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "heroes");
    try {
      const res = await apiFetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.data?.url) setForm((f) => ({ ...f, bannerImage: data.data.url }));
    } catch { /* ignore */ }
    setUploading(false);
  }

  const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none transition-all placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";
  const labelClass = "mb-2 block text-sm font-medium text-slate-300";

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <button onClick={onClose} className="rounded-xl bg-slate-800/50 p-2.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white" title="Retour à la liste">
          <Icon d={ICONS.chevronLeft} className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold sm:text-3xl">{savedId ? "Modifier" : "Nouvel"} événement</h1>
            <p className="mt-1 text-sm text-slate-400">{savedId ? `Édition de ${form.nom || "l'événement"}` : "Créer un nouvel événement"}</p>
          </div>
          {justSaved && <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-sm font-medium text-emerald-400"><Icon d={ICONS.check} className="w-4 h-4" />Enregistré</span>}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-xl space-y-4 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm md:p-8"
      >
        <div>
          <label className={labelClass}>Nom *</label>
          <input required value={form.nom} onChange={update("nom")} className={inputClass} placeholder="Conférence Insuffle 2026" />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea value={form.description} onChange={update("description")} rows={3} className={`${inputClass} resize-none`} placeholder="Description de l'événement…" />
        </div>
        <div>
          <label className={labelClass}>Client / Entreprise</label>
          <input value={form.entreprise} onChange={update("entreprise")} className={inputClass} placeholder="Acme Inc." />
          <p className="mt-1 text-xs text-slate-500">Le client lié à cet événement. Pré-rempli automatiquement dans le formulaire et les liens de partage.</p>
        </div>
        <div>
          <label className={labelClass}>{intervenantLabel}(s)</label>
          <div className="flex items-center gap-2">
            <input
              value={animateurInput}
              onChange={(e) => setAnimateurInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAnimateur(); } }}
              className={`${inputClass} flex-1`}
              placeholder={form.marque === "academie" ? "Nom du formateur (Entrée pour ajouter)" : "Nom du facilitateur (Entrée pour ajouter)"}
            />
            <button type="button" onClick={addAnimateur} className="shrink-0 rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700">
              Ajouter
            </button>
          </div>
          {animateurs.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {animateurs.map((a) => (
                <span key={a} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-500/15 px-3 py-1.5 text-sm font-medium text-teal-300">
                  {a}
                  <button type="button" onClick={() => removeAnimateur(a)} className="text-teal-400/70 transition-colors hover:text-red-400" aria-label={`Retirer ${a}`}>
                    <Icon d={ICONS.close} className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Un, plusieurs ou aucun. C&apos;est vous qui attribuez ensuite chaque témoignage à un {intervenantLabel.toLowerCase()} — le client ne le choisit pas.
          </p>
        </div>
        <div>
          <label className={labelClass}>Bannière de l&apos;événement</label>
          <div className="flex items-center gap-3">
            <input value={form.bannerImage} onChange={update("bannerImage")} className={`${inputClass} flex-1`} placeholder="https://… ou téléverser" />
            <label className="shrink-0 cursor-pointer rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700">
              {uploading ? "…" : "Téléverser"}
              <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
            </label>
          </div>
          {form.bannerImage && (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.bannerImage} alt="Bannière" className="h-32 w-full object-cover" />
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Affichée en haut du formulaire de témoignage de cet événement.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Type de témoignage (formulaire) *</label>
            <select required value={form.typeId} onChange={update("typeId")} className={inputClass}>
              <option value="">— Choisir —</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Marque</label>
            <select value={form.marque} onChange={update("marque")} className={inputClass}>
              <option value="insuffle">Insuffle (Conseil)</option>
              <option value="academie">Académie (Formations)</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Date *</label>
            <input type="date" required value={form.date} onChange={update("date")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Lieu</label>
            <input value={form.lieu} onChange={update("lieu")} className={inputClass} placeholder="Paris, France" />
          </div>
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={form.actif} onChange={update("actif")} className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-teal-500 focus:ring-teal-500/20" />
            Actif (visible publiquement)
          </label>
        </div>
        {error && <p className="rounded-xl bg-red-500/20 px-4 py-3 text-sm font-medium text-red-300">{error}</p>}
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:from-teal-400 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? "Enregistrement…" : savedId ? "Mettre à jour" : "Créer"}
          </button>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800/50 px-5 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
            Retour à la liste
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Invitations ──────────────────────────────────────────────
function InvitationsView() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [types, setTypes] = useState<TypeTemoignage[]>([]);
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [modeles, setModeles] = useState<ModeleEmail[]>([]);
  const [emailOk, setEmailOk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [envoiFor, setEnvoiFor] = useState<Invitation | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/invitations").then((r) => r.json()),
      fetch("/api/types").then((r) => r.json()),
      apiFetch("/api/evenements").then((r) => r.json()),
      apiFetch("/api/modeles").then((r) => r.json()),
      fetch("/api/health").then((r) => r.json()).catch(() => null),
    ]).then(([inv, tp, ev, md, health]) => {
      setInvitations(inv.data || []);
      setTypes(tp.data || []);
      setEvenements(ev.data || []);
      setModeles(md.data || []);
      setEmailOk(Boolean(health?.checks?.emailConfigure));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function copyLink(id: string) {
    const url = `${window.location.origin}/temoignages/nouveau?token=${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  /** Jours écoulés depuis le dernier contact (envoi ou relance). */
  function joursDepuisContact(inv: Invitation): number | null {
    const ref = inv.relanceAt || inv.envoyeeAt;
    if (!ref) return null;
    return Math.floor((Date.now() - new Date(ref).getTime()) / 86400000);
  }

  async function handleDelete(id: string) {
    const res = await apiFetch(`/api/invitations/${id}`, { method: "DELETE" });
    if (res.ok) {
      setInvitations((prev) => prev.filter((i) => i.id !== id));
      setDeleteId(null);
    }
  }

  async function handleCreate(data: Record<string, string>) {
    const res = await apiFetch("/api/invitations", { method: "POST", body: JSON.stringify(data) });
    if (res.ok) {
      loadData();
      setCreating(false);
    }
  }

  if (loading) return <Loader />;

  if (creating) {
    return <InvitationForm types={types} evenements={evenements} onSave={handleCreate} onCancel={() => setCreating(false)} />;
  }

  const typeMap = Object.fromEntries(types.map((t) => [t.id, t]));
  const evtMap = Object.fromEntries(evenements.map((e) => [e.id, e]));
  const pending = invitations.filter((i) => !i.used);
  const used = invitations.filter((i) => i.used);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold sm:text-3xl">Invitations</h1>
          <p className="mt-1 text-sm text-slate-400">{pending.length} en attente · {used.length} complétée{used.length > 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:from-teal-400 hover:to-cyan-400"
        >
          <Icon d={ICONS.plus} className="w-4 h-4" />
          Nouveau lien
        </button>
      </div>

      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">En attente</h2>
          <div className="space-y-3">
            {pending.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((inv) => {
              const t = typeMap[inv.type];
              const evt = inv.evenementId ? evtMap[inv.evenementId] : null;
              return (
                <div key={inv.id} className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5 backdrop-blur-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{inv.nom || "Client anonyme"}</span>
                        {inv.email && <span className="text-sm text-slate-400">{inv.email}</span>}
                        {inv.entreprise && <span className="text-xs text-slate-500">· {inv.entreprise}</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {t && (
                          <span className="rounded-lg px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: t.color + "33", color: t.color }}>
                            {t.label}
                          </span>
                        )}
                        <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${inv.marque === "academie" ? "bg-purple-500/20 text-purple-400" : "bg-teal-500/20 text-teal-400"}`}>
                          {inv.marque}
                        </span>
                        {evt && (
                          <span className="rounded-lg bg-cyan-500/20 px-2.5 py-1 text-xs font-medium text-cyan-400">
                            {evt.nom}
                          </span>
                        )}
                        <span className="text-xs text-slate-500">{new Date(inv.createdAt).toLocaleDateString("fr-FR")}</span>
                        {/* Suivi de l'envoi : envoyée / relancée / à relancer */}
                        {inv.relanceAt ? (
                          <span className="rounded-lg bg-blue-500/20 px-2.5 py-1 text-xs font-medium text-blue-400">
                            Relancée le {new Date(inv.relanceAt).toLocaleDateString("fr-FR")}
                          </span>
                        ) : inv.envoyeeAt ? (
                          <span className="rounded-lg bg-blue-500/20 px-2.5 py-1 text-xs font-medium text-blue-400">
                            Envoyée le {new Date(inv.envoyeeAt).toLocaleDateString("fr-FR")}
                          </span>
                        ) : (
                          <span className="rounded-lg bg-slate-700/50 px-2.5 py-1 text-xs font-medium text-slate-500">
                            Jamais envoyée
                          </span>
                        )}
                        {(joursDepuisContact(inv) ?? 0) >= 7 && (
                          <span className="rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-400">
                            À relancer
                          </span>
                        )}
                      </div>
                      {inv.message && <p className="mt-2 text-sm text-slate-400 line-clamp-2">{inv.message}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => copyLink(inv.id)}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                      >
                        <Icon d={ICONS.copy} className="w-3.5 h-3.5" />
                        {copied === inv.id ? "Copié !" : "Copier le lien"}
                      </button>
                      <button
                        onClick={() => setEnvoiFor(inv)}
                        className="flex items-center gap-1.5 rounded-lg bg-teal-500/20 px-3 py-2 text-xs font-medium text-teal-400 transition-colors hover:bg-teal-500/30"
                      >
                        <Icon d={ICONS.send} className="w-3.5 h-3.5" />
                        {inv.envoyeeAt ? "Relancer" : "Envoyer"}
                      </button>
                      <button
                        onClick={() => setDeleteId(inv.id)}
                        className="rounded-lg p-2 text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Icon d={ICONS.trash} className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {used.length > 0 && (
        <div>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Complétées</h2>
          <div className="space-y-3">
            {used.sort((a, b) => new Date(b.usedAt || b.createdAt).getTime() - new Date(a.usedAt || a.createdAt).getTime()).map((inv) => {
              const t = typeMap[inv.type];
              return (
                <div key={inv.id} className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-5 opacity-70">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
                        <Icon d={ICONS.check} className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <span className="font-medium">{inv.nom || "Client anonyme"}</span>
                        {t && <span className="ml-2 text-xs text-slate-500">{t.label}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">{inv.usedAt ? new Date(inv.usedAt).toLocaleDateString("fr-FR") : ""}</span>
                      <button onClick={() => setDeleteId(inv.id)} className="rounded-lg p-2 text-slate-500 transition-all hover:bg-red-500/10 hover:text-red-400">
                        <Icon d={ICONS.trash} className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {invitations.length === 0 && (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-12 text-center backdrop-blur-sm">
          <Icon d={ICONS.link} className="mx-auto mb-4 w-12 h-12 text-slate-600" />
          <p className="text-slate-400">Aucune invitation. Créez un lien unique à envoyer à vos clients.</p>
        </div>
      )}

      {deleteId && (
        <Modal onClose={() => setDeleteId(null)}>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
              <Icon d={ICONS.trash} className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Supprimer cette invitation ?</h3>
            <p className="mb-6 text-sm text-slate-400">Le lien ne fonctionnera plus.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteId(null)} className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700">Annuler</button>
              <button onClick={() => handleDelete(deleteId)} className="rounded-xl bg-red-500/20 px-5 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30">Supprimer</button>
            </div>
          </div>
        </Modal>
      )}

      {envoiFor && (
        <EnvoiModal
          inv={envoiFor}
          evt={envoiFor.evenementId ? evtMap[envoiFor.evenementId] || null : null}
          modeles={modeles}
          emailOk={emailOk}
          onClose={() => setEnvoiFor(null)}
          onDone={() => { setEnvoiFor(null); loadData(); }}
        />
      )}
    </div>
  );
}

// ─── Modal d'envoi d'email (modèles + variables résolues) ─────
function EnvoiModal({
  inv,
  evt,
  modeles,
  emailOk,
  onClose,
  onDone,
}: {
  inv: Invitation;
  evt: Evenement | null;
  modeles: ModeleEmail[];
  emailOk: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  // Suggestion intelligente : relance si déjà envoyée, sinon invitation.
  const suggestion = modeles.find((m) => m.categorie === (inv.envoyeeAt ? "relance" : "invitation"));
  const [modeleId, setModeleId] = useState(suggestion?.id || modeles[0]?.id || "");
  const [sujet, setSujet] = useState(() => suggestion ? resoudreVariables(suggestion.sujet, inv, evt) : "");
  const [corps, setCorps] = useState(() => suggestion ? resoudreVariables(suggestion.corps, inv, evt) : "");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  function choisirModele(id: string) {
    setModeleId(id);
    const m = modeles.find((x) => x.id === id);
    if (m) {
      setSujet(resoudreVariables(m.sujet, inv, evt));
      setCorps(resoudreVariables(m.corps, inv, evt));
    }
  }

  async function marquerEnvoyee() {
    await apiFetch(`/api/invitations/${inv.id}/envoyer`, {
      method: "POST",
      body: JSON.stringify({ marquerSeulement: true }),
    }).catch(() => {});
    onDone();
  }

  async function envoyerBrevo() {
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/api/invitations/${inv.id}/envoyer`, {
        method: "POST",
        body: JSON.stringify({ sujet, corps }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.brevoIndisponible
          ? "Envoi direct non configuré (BREVO_API_KEY) — utilisez « Ouvrir dans mon email » ou « Copier »"
          : data.error || "Erreur lors de l'envoi");
        setBusy(false);
        return;
      }
      onDone();
    } catch {
      setError("Erreur de connexion");
      setBusy(false);
    }
  }

  function ouvrirMailto() {
    const mailto = `mailto:${inv.email || ""}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
    window.open(mailto);
    marquerEnvoyee();
  }

  function copier() {
    navigator.clipboard.writeText(`${sujet}\n\n${corps}`).then(() => {
      setCopied(true);
      setTimeout(() => { marquerEnvoyee(); }, 600);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700/50 bg-slate-800 p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{inv.envoyeeAt ? "Relancer" : "Envoyer l'invitation"}</h3>
            <p className="text-xs text-slate-500">
              {inv.nom || "Client"}{inv.email ? ` · ${inv.email}` : " · pas d'email renseigné"}
              {evt ? ` · ${evt.nom}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white">
            <Icon d={ICONS.close} className="w-5 h-5" />
          </button>
        </div>

        {modeles.length > 0 && (
          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Modèle</label>
            <select
              value={modeleId}
              onChange={(e) => choisirModele(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500"
            >
              {modeles.map((m) => (
                <option key={m.id} value={m.id}>{m.nom} ({m.categorie})</option>
              ))}
            </select>
          </div>
        )}

        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Sujet</label>
          <input
            value={sujet}
            onChange={(e) => setSujet(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Message (variables déjà remplacées, modifiable)</label>
          <textarea
            value={corps}
            onChange={(e) => setCorps(e.target.value)}
            rows={11}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/50 p-3 text-sm text-white outline-none focus:border-teal-500"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-amber-500/20 px-4 py-3 text-sm font-medium text-amber-300">{error}</div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={copier} className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700">
            <Icon d={ICONS.copy} className="w-4 h-4" />
            {copied ? "Copié !" : "Copier le message"}
          </button>
          <button onClick={ouvrirMailto} className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700">
            <Icon d={ICONS.mail} className="w-4 h-4" />
            Ouvrir dans mon email
          </button>
          {emailOk && inv.email && (
            <button
              onClick={envoyerBrevo}
              disabled={busy || !sujet.trim() || !corps.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:from-teal-400 hover:to-cyan-400 disabled:opacity-50"
            >
              <Icon d={ICONS.send} className="w-4 h-4" />
              {busy ? "Envoi…" : `Envoyer à ${inv.email}`}
            </button>
          )}
        </div>
        <p className="mt-3 text-right text-xs text-slate-500">
          « Copier » et « Ouvrir dans mon email » marquent aussi l&apos;invitation comme envoyée.
        </p>
      </div>
    </div>
  );
}

// ─── Invitation Form ──────────────────────────────────────────
function InvitationForm({ types, evenements, onSave, onCancel }: { types: TypeTemoignage[]; evenements: Evenement[]; onSave: (data: Record<string, string>) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    nom: "",
    email: "",
    entreprise: "",
    type: types[0]?.id || "",
    marque: "insuffle",
    message: "",
    evenementId: "",
  });

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  // Quand un événement est sélectionné, on hérite de son client/type/marque.
  const selectedEvent = form.evenementId ? evenements.find((e) => e.id === form.evenementId) : null;
  const eventType = selectedEvent ? types.find((t) => t.id === selectedEvent.typeId) : null;

  function selectEvent(id: string) {
    const evt = id ? evenements.find((e) => e.id === id) : null;
    setForm((f) => ({
      ...f,
      evenementId: id,
      // Hérite automatiquement des infos de l'événement (client lié).
      entreprise: evt?.entreprise ?? f.entreprise,
      type: evt?.typeId ?? f.type,
      marque: evt?.marque ?? f.marque,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Les valeurs dérivées de l'événement priment.
    const payload = selectedEvent
      ? {
          ...form,
          entreprise: selectedEvent.entreprise || form.entreprise,
          type: selectedEvent.typeId,
          marque: selectedEvent.marque,
        }
      : form;
    onSave(payload);
  }

  const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none transition-all placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <button onClick={onCancel} className="rounded-xl bg-slate-800/50 p-2.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
          <Icon d={ICONS.chevronLeft} className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold sm:text-3xl">Nouvelle invitation</h1>
          <p className="mt-1 text-sm text-slate-400">Créez un lien unique pour votre client</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-xl space-y-4 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm md:p-8"
      >
        {/* Événement en premier : il détermine le client, le formulaire et la marque */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">Événement lié</label>
          <select value={form.evenementId} onChange={(e) => selectEvent(e.target.value)} className={inputClass}>
            <option value="">— Aucun (invitation générale) —</option>
            {evenements.filter((e) => e.actif).map((ev) => <option key={ev.id} value={ev.id}>{ev.nom}{ev.entreprise ? ` · ${ev.entreprise}` : ""}</option>)}
          </select>
          {selectedEvent && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-slate-900/50 px-3 py-2 text-xs">
              <span className="text-slate-400">Hérité de l&apos;événement :</span>
              {selectedEvent.entreprise && <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">{selectedEvent.entreprise}</span>}
              {eventType && <span className="rounded px-2 py-0.5" style={{ backgroundColor: eventType.color + "33", color: eventType.color }}>{eventType.label}</span>}
              <span className={`rounded px-2 py-0.5 ${selectedEvent.marque === "academie" ? "bg-purple-500/20 text-purple-400" : "bg-teal-500/20 text-teal-400"}`}>{selectedEvent.marque}</span>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Nom du client</label>
            <input value={form.nom} onChange={update("nom")} className={inputClass} placeholder="Marie Dupont" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Email</label>
            <input type="email" value={form.email} onChange={update("email")} className={inputClass} placeholder="marie@entreprise.com" />
          </div>
        </div>

        {/* Champs masqués quand un événement est choisi (déjà déterminés par l'événement) */}
        {!selectedEvent && (
          <>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Entreprise</label>
              <input value={form.entreprise} onChange={update("entreprise")} className={inputClass} placeholder="Acme Inc." />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Type de témoignage</label>
                <select value={form.type} onChange={update("type")} className={inputClass}>
                  <option value="">— Général —</option>
                  {types.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Marque</label>
                <select value={form.marque} onChange={update("marque")} className={inputClass}>
                  <option value="insuffle">Insuffle (Conseil)</option>
                  <option value="academie">Académie (Formations)</option>
                </select>
              </div>
            </div>
          </>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">Message personnel (visible sur le formulaire)</label>
          <textarea value={form.message} onChange={update("message")} rows={3} className={`${inputClass} resize-none`} placeholder="Bonjour Marie, merci pour cette belle collaboration…" />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:from-teal-400 hover:to-cyan-400">
            Créer le lien
          </button>
          <button type="button" onClick={onCancel} className="rounded-xl bg-slate-800/50 px-5 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Backup/Restore ───────────────────────────────────────────
// ─── Modèles d'email ──────────────────────────────────────────
const CATEGORIES_MODELE: { value: ModeleEmail["categorie"]; label: string; color: string }[] = [
  { value: "invitation", label: "Invitation", color: "text-teal-400 bg-teal-500/20" },
  { value: "relance", label: "Relance", color: "text-amber-400 bg-amber-500/20" },
  { value: "remerciement", label: "Remerciement", color: "text-emerald-400 bg-emerald-500/20" },
  { value: "autre", label: "Autre", color: "text-slate-400 bg-slate-700/50" },
];

function ModelesView() {
  const [modeles, setModeles] = useState<ModeleEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ModeleEmail | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    apiFetch("/api/modeles").then((r) => r.json()).then((d) => {
      setModeles(d.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleDelete(id: string) {
    const res = await apiFetch(`/api/modeles/${id}`, { method: "DELETE" });
    if (res.ok) {
      setModeles((prev) => prev.filter((m) => m.id !== id));
      setDeleteId(null);
    }
  }

  if (loading) return <Loader />;

  if (creating || editing) {
    return (
      <ModeleForm
        initial={editing}
        onClose={() => { setEditing(null); setCreating(false); loadData(); }}
      />
    );
  }

  const catInfo = Object.fromEntries(CATEGORIES_MODELE.map((c) => [c.value, c]));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold sm:text-3xl">Modèles d&apos;email</h1>
          <p className="mt-1 text-sm text-slate-400">
            Vos messages prêts à envoyer — les variables {"{prenom} {entreprise} {evenement} {lien}"} sont remplies automatiquement
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:from-teal-400 hover:to-cyan-400"
        >
          <Icon d={ICONS.plus} className="w-4 h-4" />
          Nouveau modèle
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {modeles.map((m) => {
          const cat = catInfo[m.categorie] || catInfo.autre;
          return (
            <div key={m.id} className="flex flex-col rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5 backdrop-blur-sm transition-all hover:border-teal-500/20">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="font-semibold text-white">{m.nom}</h3>
                <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium ${cat.color}`}>{cat.label}</span>
              </div>
              <p className="mb-1 text-sm font-medium text-slate-300">{m.sujet}</p>
              <p className="mb-4 flex-1 whitespace-pre-line text-xs text-slate-500 line-clamp-4">{m.corps}</p>
              <div className="flex gap-2">
                <button onClick={() => setEditing(m)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:text-white">
                  Modifier
                </button>
                <button onClick={() => setDeleteId(m.id)} className="rounded-lg px-3 py-1.5 text-xs text-red-400 transition-all hover:bg-red-500/10">
                  Supprimer
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {modeles.length === 0 && (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-12 text-center backdrop-blur-sm">
          <Icon d={ICONS.mail} className="mx-auto mb-4 w-12 h-12 text-slate-600" />
          <p className="text-slate-400">Aucun modèle. Créez votre premier message type.</p>
        </div>
      )}

      {deleteId && (
        <Modal onClose={() => setDeleteId(null)}>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
              <Icon d={ICONS.trash} className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Supprimer ce modèle ?</h3>
            <p className="mb-6 text-sm text-slate-400">Les invitations déjà envoyées ne sont pas affectées.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteId(null)} className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700">Annuler</button>
              <button onClick={() => handleDelete(deleteId)} className="rounded-xl bg-red-500/20 px-5 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30">Supprimer</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ModeleForm({ initial, onClose }: { initial: ModeleEmail | null; onClose: () => void }) {
  const [form, setForm] = useState({
    nom: initial?.nom || "",
    categorie: initial?.categorie || "invitation",
    sujet: initial?.sujet || "",
    corps: initial?.corps || "",
  });
  const [savedId, setSavedId] = useState(initial?.id || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      // On reste sur le formulaire après enregistrement (POST puis PUT).
      const url = savedId ? `/api/modeles/${savedId}` : "/api/modeles";
      const method = savedId ? "PUT" : "POST";
      const res = await apiFetch(url, { method, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
      } else {
        setSavedId(data.data.id);
        setSaved(true);
      }
    } catch {
      setError("Erreur de connexion");
    }
    setSaving(false);
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button onClick={onClose} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
          <Icon d={ICONS.chevronLeft} className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold sm:text-2xl">{initial ? "Modifier le modèle" : "Nouveau modèle d'email"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Nom du modèle</label>
            <input
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500"
              placeholder="Ex : Invitation après séminaire"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Catégorie</label>
            <select
              value={form.categorie}
              onChange={(e) => setForm({ ...form, categorie: e.target.value as ModeleEmail["categorie"] })}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500"
            >
              {CATEGORIES_MODELE.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Sujet</label>
          <input
            value={form.sujet}
            onChange={(e) => setForm({ ...form, sujet: e.target.value })}
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500"
            placeholder="Ex : Votre retour sur {evenement}"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Message</label>
          <textarea
            value={form.corps}
            onChange={(e) => setForm({ ...form, corps: e.target.value })}
            required
            rows={14}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/50 p-3 text-sm text-white outline-none focus:border-teal-500"
            placeholder={"Bonjour {prenom},\n\n… votre message …\n\n👉 {lien}\n\n{signature}"}
          />
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 px-4 py-3 text-xs text-slate-400">
          Variables remplacées automatiquement à l&apos;envoi :{" "}
          <code className="text-teal-400">{"{prenom}"}</code> <code className="text-teal-400">{"{nom}"}</code>{" "}
          <code className="text-teal-400">{"{entreprise}"}</code> <code className="text-teal-400">{"{evenement}"}</code>{" "}
          <code className="text-teal-400">{"{intervenant}"}</code> (facilitateur/formateur){" "}
          <code className="text-teal-400">{"{lien}"}</code> (lien unique du client) <code className="text-teal-400">{"{signature}"}</code> (selon la marque)
        </div>

        {error && <div className="rounded-xl bg-red-500/20 px-4 py-3 text-sm font-medium text-red-300">{error}</div>}
        {saved && !error && (
          <div className="rounded-xl bg-emerald-500/20 px-4 py-3 text-sm font-medium text-emerald-300">✓ Enregistré</div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-2.5 font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:from-teal-400 hover:to-cyan-400 disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-6 py-2.5 font-medium text-slate-300 transition-colors hover:bg-slate-700">
            Retour à la liste
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── API & Flux : liens de lecture prêts à copier ─────────────
function ApiView() {
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    apiFetch("/api/evenements").then((r) => r.json()).then((d) => setEvenements(d.data || [])).catch(() => {});
  }, []);

  function copy(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(url);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const flux: { label: string; description: string; path: string }[] = [
    { label: "Tous les témoignages publiés", description: "Le flux complet, prêt à intégrer sur n'importe quel site (CORS ouvert)", path: "/api/public/temoignages" },
    { label: "Témoignages Insuffle", description: "Uniquement la marque Insuffle (conseil)", path: "/api/public/temoignages?marque=insuffle" },
    { label: "Témoignages Académie", description: "Uniquement Insuffle Académie (formations)", path: "/api/public/temoignages?marque=academie" },
    { label: "Meilleures notes (4★ et +)", description: "Sélection des témoignages les mieux notés", path: "/api/public/temoignages?note=4" },
    { label: "Version anonymisée", description: "Auteurs raccourcis (« Marie D. »), sans entreprise ni avatar", path: "/api/public/temoignages?anonyme=1" },
  ];

  function LinkRow({ label, description, path }: { label: string; description: string; path: string }) {
    const url = `${origin}${path}`;
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700/50 bg-slate-900/40 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white">{label}</p>
          <p className="text-xs text-slate-500">{description}</p>
          <code className="mt-1 block truncate text-xs text-teal-400">{path}</code>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={() => copy(url)} className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white">
            <Icon d={ICONS.copy} className="w-3.5 h-3.5" />
            {copied === url ? "Copié !" : "Copier"}
          </button>
          <a href={url} target="_blank" rel="noreferrer" className="rounded-lg bg-teal-500/20 px-3 py-2 text-xs font-medium text-teal-400 transition-colors hover:bg-teal-500/30">
            Ouvrir
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold sm:text-3xl">API &amp; Flux</h1>
        <p className="mt-1 text-sm text-slate-400">
          Liens de lecture publics (JSON, CORS ouvert) — seuls les témoignages <strong>publiés</strong> y apparaissent, champs privés exclus
        </p>
      </div>

      <div className="mb-8 space-y-3">
        {flux.map((f) => <LinkRow key={f.path} {...f} />)}
      </div>

      {/* Widget embarquable : afficher les témoignages sur insuffle.com etc. */}
      <div className="mb-8 rounded-2xl border border-teal-500/20 bg-slate-800/50 p-6 backdrop-blur-sm">
        <h2 className="mb-2 text-sm font-semibold text-white">Widget à intégrer sur vos sites</h2>
        <p className="mb-4 text-sm text-slate-400">
          Une seule balise à coller dans n&apos;importe quelle page (insuffle.com, insuffle-academie.com, Webflow, WordPress…) :
          les témoignages publiés s&apos;affichent en cartes avec étoiles, sans conflit avec le style du site (Shadow DOM).
        </p>
        <div className="space-y-3">
          {[
            { label: "Témoignages Insuffle (grille)", code: `<script src="${origin}/widget.js" defer data-marque="insuffle" data-limit="6"></script>` },
            { label: "Témoignages Académie (grille)", code: `<script src="${origin}/widget.js" defer data-marque="academie" data-limit="6"></script>` },
            { label: "Liste verticale, fond sombre, anonymisé", code: `<script src="${origin}/widget.js" defer data-layout="list" data-theme="dark" data-anonyme="1" data-limit="4"></script>` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-700/50 bg-slate-900/40 px-4 py-3">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-slate-300">{s.label}</p>
                <button onClick={() => copy(s.code)} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white">
                  <Icon d={ICONS.copy} className="w-3.5 h-3.5" />
                  {copied === s.code ? "Copié !" : "Copier"}
                </button>
              </div>
              <code className="block overflow-x-auto whitespace-nowrap text-xs text-teal-400">{s.code}</code>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Options : <code className="text-teal-400">data-note=&quot;4&quot;</code> (note min), <code className="text-teal-400">data-event=&quot;id&quot;</code>, <code className="text-teal-400">data-type=&quot;id&quot;</code>, <code className="text-teal-400">data-target=&quot;#avis&quot;</code> (emplacement précis)
        </p>
      </div>

      {evenements.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Par événement</h2>
          <div className="space-y-3">
            {evenements.map((evt) => (
              <LinkRow
                key={evt.id}
                label={evt.nom}
                description={evt.entreprise ? `Client : ${evt.entreprise}` : "Témoignages de cet événement uniquement"}
                path={`/api/public/temoignages?event=${evt.id}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
        <h2 className="mb-3 text-sm font-semibold text-white">Filtres combinables</h2>
        <ul className="space-y-1.5 text-sm text-slate-400">
          <li><code className="text-teal-400">?marque=insuffle|academie</code> — filtrer par marque</li>
          <li><code className="text-teal-400">?type=&lt;typeId&gt;</code> — filtrer par typologie de formulaire</li>
          <li><code className="text-teal-400">?event=&lt;evenementId&gt;</code> — filtrer par événement</li>
          <li><code className="text-teal-400">?note=4</code> — note minimale</li>
          <li><code className="text-teal-400">?limit=10</code> — limiter le nombre de résultats</li>
          <li><code className="text-teal-400">?anonyme=1</code> — anonymiser les auteurs</li>
        </ul>
        <p className="mt-4 text-xs text-slate-500">
          Exemple : <code className="text-teal-400">/api/public/temoignages?marque=academie&amp;note=4&amp;limit=6&amp;anonyme=1</code>
        </p>
      </div>
    </div>
  );
}

function BackupView() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"fusion" | "remplacer">("fusion");
  const [info, setInfo] = useState<{
    snapshotsLocaux: number;
    dernierSnapshot: string | null;
    backupGitHubActif: boolean;
    compteurs: { temoignages: number; types: number; evenements: number; invitations: number };
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadStatus = useCallback(() => {
    apiFetch("/api/backup/status").then((r) => r.json()).then((d) => {
      if (d.success) setInfo(d.data);
    }).catch(() => {});
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  async function handleExport() {
    setStatus("loading");
    setMessage("");
    try {
      const res = await apiFetch("/api/backup");
      if (!res.ok) { setStatus("error"); setMessage("Erreur lors de l'export"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-temoignages-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("success");
      setMessage("Backup exporté avec succès");
    } catch {
      setStatus("error");
      setMessage("Erreur de connexion");
    }
  }

  async function handleImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    if (mode === "remplacer" && !window.confirm(
      "Mode REMPLACER : toutes les données actuelles seront remplacées par le contenu du backup. Continuer ?"
    )) return;
    setStatus("loading");
    setMessage("");
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await apiFetch(`/api/backup?mode=${mode}`, { method: "POST", body: JSON.stringify(json) });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Erreur lors de la restauration");
        return;
      }
      setStatus("success");
      setMessage(data.message || "Restauration effectuée");
      loadStatus();
    } catch {
      setStatus("error");
      setMessage("Fichier JSON invalide");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold sm:text-3xl">Sauvegarde</h1>
        <p className="mt-1 text-sm text-slate-400">Exporter ou restaurer vos données</p>
      </div>

      {/* Statut du filet de sécurité */}
      {info && (
        <div className="mb-6 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-sm font-semibold text-white">État des sauvegardes automatiques</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-2xl font-bold text-teal-400">{info.snapshotsLocaux}</p>
              <p className="text-xs text-slate-500">snapshots locaux (auto, à chaque écriture)</p>
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {info.dernierSnapshot
                  ? new Date(info.dernierSnapshot).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                  : "—"}
              </p>
              <p className="text-xs text-slate-500">dernière sauvegarde</p>
            </div>
            <div>
              <p className={`text-sm font-semibold ${info.backupGitHubActif ? "text-emerald-400" : "text-amber-400"}`}>
                {info.backupGitHubActif ? "Activé" : "Non configuré"}
              </p>
              <p className="text-xs text-slate-500">backup GitHub distant{!info.backupGitHubActif && " (BACKUP_GITHUB_* dans .env)"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {info.compteurs.temoignages} témoignages · {info.compteurs.evenements} événements
              </p>
              <p className="text-xs text-slate-500">{info.compteurs.types} types · {info.compteurs.invitations} invitations</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Export */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20">
              <Icon d={ICONS.download} className="w-5 h-5 text-teal-400" />
            </div>
            <h2 className="text-lg font-semibold">Exporter</h2>
          </div>
          <p className="mb-6 text-sm text-slate-400">
            Télécharger l&apos;ensemble des témoignages et types au format JSON.
          </p>
          <button
            onClick={handleExport}
            disabled={status === "loading"}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:from-teal-400 hover:to-cyan-400 disabled:opacity-50"
          >
            <Icon d={ICONS.download} className="w-4 h-4" />
            Télécharger le backup
          </button>
        </div>

        {/* Import */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
              <Icon d={ICONS.upload} className="w-5 h-5 text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold">Restaurer</h2>
          </div>
          <p className="mb-4 text-sm text-slate-400">
            Importer un fichier de backup JSON.
          </p>
          <div className="mb-4 space-y-2">
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-700/50 bg-slate-900/40 px-3 py-2.5 text-sm transition-colors has-[:checked]:border-teal-500/40">
              <input type="radio" name="restore-mode" checked={mode === "fusion"} onChange={() => setMode("fusion")} className="mt-0.5 accent-teal-500" />
              <span>
                <span className="font-medium text-white">Fusionner (recommandé)</span>
                <span className="block text-xs text-slate-500">Ajoute uniquement ce qui manque — ne touche jamais aux données existantes</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-700/50 bg-slate-900/40 px-3 py-2.5 text-sm transition-colors has-[:checked]:border-amber-500/40">
              <input type="radio" name="restore-mode" checked={mode === "remplacer"} onChange={() => setMode("remplacer")} className="mt-0.5 accent-amber-500" />
              <span>
                <span className="font-medium text-white">Remplacer tout</span>
                <span className="block text-xs text-slate-500">Remplace intégralement les données par le backup (confirmation demandée)</span>
              </span>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" accept=".json" className="text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-300 hover:file:bg-slate-700" />
            <button
              onClick={handleImport}
              disabled={status === "loading"}
              className="shrink-0 rounded-xl bg-amber-500/20 px-5 py-2.5 font-semibold text-amber-400 transition-all hover:bg-amber-500/30 disabled:opacity-50"
            >
              Restaurer
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div className={`mt-6 rounded-xl px-4 py-3 text-sm font-medium ${status === "success" ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
          {message}
        </div>
      )}
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────
function Stars({ note }: { note: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className="h-3.5 w-3.5" viewBox="0 0 20 20" fill={i <= note ? "#f59e0b" : "none"} stroke={i <= note ? "#f59e0b" : "#475569"} strokeWidth={1.5}>
          <path d="M10 1.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L10 14.9l-5.25 2.8 1-5.85L1.5 7.65l5.9-.85L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

function Loader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-teal-500/30 border-t-teal-500" />
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-slate-700/50 bg-slate-800 p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
