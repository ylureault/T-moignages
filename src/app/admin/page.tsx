"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Temoignage, TypeTemoignage, Invitation, Evenement, ChampPersonnalise, NoteStyle } from "@/types";

type View = "dashboard" | "temoignages" | "types" | "evenements" | "invitations" | "backup";

const SOURCES = ["google", "trustpilot", "linkedin", "site", "autre"] as const;
const MARQUES = ["insuffle", "academie"] as const;
const NOTE_STYLES: { value: NoteStyle; label: string }[] = [
  { value: "stars", label: "Étoiles" },
  { value: "smileys", label: "Smileys" },
  { value: "scale", label: "Échelle 1-10" },
  { value: "thumbs", label: "Pouces" },
];
const CHAMP_TYPES: ChampPersonnalise["type"][] = ["text", "textarea", "note", "select", "checkbox"];

// ─── API helper ───────────────────────────────────────────────
function apiFetch(path: string, apiKey: string, opts: RequestInit = {}) {
  return fetch(path, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      "x-api-key": apiKey,
      ...(!opts.body || opts.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
    },
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
};

// ─── Main Admin Page ──────────────────────────────────────────
export default function AdminPage() {
  const [apiKey, setApiKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_api_key");
    if (stored) {
      apiFetch("/api/backup", stored).then((r) => {
        if (r.ok) {
          setApiKey(stored);
          setAuthenticated(true);
        } else {
          sessionStorage.removeItem("admin_api_key");
        }
        setChecking(false);
      }).catch(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await apiFetch("/api/backup", apiKey);
      if (res.ok) {
        sessionStorage.setItem("admin_api_key", apiKey);
        setAuthenticated(true);
      } else {
        const data = await res.json();
        setAuthError(data.error || "Clé invalide");
      }
    } catch {
      setAuthError("Erreur de connexion");
    }
    setAuthLoading(false);
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
      <div className="flex min-h-screen items-center justify-center px-6">
        <form onSubmit={handleLogin} className="w-full max-w-md rounded-2xl border border-slate-700/50 bg-slate-800/50 p-8 backdrop-blur-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-600">
              <Icon d={ICONS.key} className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold">Administration</h1>
          </div>
          <label className="mb-2 block text-sm font-medium text-slate-300">Clé API</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none transition-all placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            placeholder="Votre clé API secrète"
            autoFocus
          />
          {authError && (
            <p className="mb-4 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-300">{authError}</p>
          )}
          <button
            type="submit"
            disabled={authLoading || !apiKey}
            className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:from-teal-400 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {authLoading ? "Vérification…" : "Connexion"}
          </button>
        </form>
      </div>
    );
  }

  return <AdminShell apiKey={apiKey} onLogout={() => { sessionStorage.removeItem("admin_api_key"); setAuthenticated(false); setApiKey(""); }} />;
}

// ─── Admin Shell (post-auth) ──────────────────────────────────
function AdminShell({ apiKey, onLogout }: { apiKey: string; onLogout: () => void }) {
  const [view, setView] = useState<View>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems: { id: View; label: string; icon: string }[] = [
    { id: "dashboard", label: "Tableau de bord", icon: ICONS.dashboard },
    { id: "temoignages", label: "Témoignages", icon: ICONS.document },
    { id: "types", label: "Types", icon: ICONS.inbox },
    { id: "evenements", label: "Événements", icon: ICONS.calendar },
    { id: "invitations", label: "Invitations", icon: ICONS.link },
    { id: "backup", label: "Sauvegarde", icon: ICONS.server },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-72" : "w-20"} flex flex-col border-r border-slate-800/50 bg-slate-900/50 backdrop-blur-xl transition-all duration-300 ease-in-out`}>
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
      <main className="flex-1 overflow-y-auto p-8">
        {view === "dashboard" && <DashboardView apiKey={apiKey} onNav={setView} />}
        {view === "temoignages" && <TemoignagesView apiKey={apiKey} />}
        {view === "types" && <TypesView apiKey={apiKey} />}
        {view === "evenements" && <EvenementsView apiKey={apiKey} />}
        {view === "invitations" && <InvitationsView apiKey={apiKey} />}
        {view === "backup" && <BackupView apiKey={apiKey} />}
      </main>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────
function DashboardView({ apiKey, onNav }: { apiKey: string; onNav: (v: View) => void }) {
  const [temoignages, setTemoignages] = useState<Temoignage[]>([]);
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/temoignages?limit=50").then((r) => r.json()),
      apiFetch("/api/evenements", apiKey).then((r) => r.json()),
    ]).then(([td, ev]) => {
      setTemoignages(td.data || []);
      setEvenements(ev.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [apiKey]);

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
        <h1 className="text-3xl font-bold">Tableau de bord</h1>
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
            <div key={t.id} className="flex items-center gap-4 rounded-xl border border-slate-800/50 p-4 transition-colors hover:bg-slate-800/30">
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
                </div>
                <p className="truncate text-sm text-slate-400">{t.contenu}</p>
              </div>
              <span className="shrink-0 text-xs text-slate-500">{t.date}</span>
            </div>
          ))}
          {recent.length === 0 && <p className="text-sm text-slate-500">Aucun témoignage</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Témoignages CRUD ─────────────────────────────────────────
function TemoignagesView({ apiKey }: { apiKey: string }) {
  const [temoignages, setTemoignages] = useState<Temoignage[]>([]);
  const [types, setTypes] = useState<TypeTemoignage[]>([]);
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Temoignage | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMarque, setFilterMarque] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/temoignages?limit=50").then((r) => r.json()),
      fetch("/api/types").then((r) => r.json()),
      apiFetch("/api/evenements", apiKey).then((r) => r.json()),
    ]).then(([td, tp, ev]) => {
      setTemoignages(td.data || []);
      setTypes(tp.data || []);
      setEvenements(ev.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [apiKey]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = temoignages.filter((t) => {
    if (filterMarque && t.marque !== filterMarque) return false;
    if (search) {
      const s = search.toLowerCase();
      return t.auteur.toLowerCase().includes(s) || t.entreprise.toLowerCase().includes(s) || t.contenu.toLowerCase().includes(s);
    }
    return true;
  });

  async function handleDelete(id: string) {
    const res = await apiFetch(`/api/temoignages/${id}`, apiKey, { method: "DELETE" });
    if (res.ok) {
      setTemoignages((prev) => prev.filter((t) => t.id !== id));
      setDeleteId(null);
    }
  }

  async function togglePublie(t: Temoignage) {
    const res = await apiFetch(`/api/temoignages/${t.id}`, apiKey, {
      method: "PUT",
      body: JSON.stringify({ publie: t.publie === false }),
    });
    if (res.ok) loadData();
  }

  async function handleSave(data: Record<string, unknown>) {
    setSaving(true);
    setError("");
    try {
      const isEdit = !!editing;
      const url = isEdit ? `/api/temoignages/${editing!.id}` : "/api/temoignages";
      const method = isEdit ? "PUT" : "POST";
      const res = await apiFetch(url, apiKey, { method, body: JSON.stringify(data) });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Erreur");
        setSaving(false);
        return;
      }
      loadData();
      setEditing(null);
      setCreating(false);
    } catch {
      setError("Erreur de connexion");
    }
    setSaving(false);
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
        apiKey={apiKey}
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
          <h1 className="text-3xl font-bold">Témoignages</h1>
          <p className="mt-1 text-sm text-slate-400">{temoignages.length} témoignage{temoignages.length > 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:from-teal-400 hover:to-cyan-400"
        >
          <Icon d={ICONS.plus} className="w-4 h-4" />
          Nouveau
        </button>
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
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Auteur</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Note</th>
              <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 md:table-cell">Marque</th>
              <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 lg:table-cell">Source</th>
              <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 lg:table-cell">Vérifié</th>
              <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 xl:table-cell">Événement</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Date</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-slate-800/50 transition-colors hover:bg-slate-800/30">
                <td className="px-4 py-4">
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
                <td className="px-4 py-4"><Stars note={t.note} /></td>
                <td className="hidden px-4 py-4 md:table-cell">
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${t.marque === "academie" ? "bg-purple-500/20 text-purple-400" : "bg-teal-500/20 text-teal-400"}`}>
                    {t.marque}
                  </span>
                </td>
                <td className="hidden px-4 py-4 text-sm text-slate-400 lg:table-cell">{t.source}</td>
                <td className="hidden px-4 py-4 lg:table-cell">
                  {t.verifie
                    ? <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400">Oui</span>
                    : <span className="rounded-lg bg-slate-700/50 px-2.5 py-1 text-xs font-medium text-slate-500">Non</span>
                  }
                </td>
                <td className="hidden px-4 py-4 xl:table-cell">
                  {t.evenementId && evtMap[t.evenementId] ? (
                    <span className="rounded-lg bg-cyan-500/20 px-2.5 py-1 text-xs font-medium text-cyan-400">
                      {evtMap[t.evenementId].nom}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-600">—</span>
                  )}
                </td>
                <td className="px-4 py-4 text-sm text-slate-400">{t.date}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1">
                    <button onClick={() => togglePublie(t)} className={`rounded-lg p-2 transition-colors ${t.publie === false ? "text-slate-500 hover:bg-emerald-500/10 hover:text-emerald-400" : "text-emerald-400 hover:bg-slate-700/50 hover:text-slate-400"}`} title={t.publie === false ? "Publier" : "Masquer"}>
                      <Icon d={t.publie === false ? ICONS.eyeOff : ICONS.eye} className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditing(t)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white" title="Modifier">
                      <Icon d={ICONS.edit} className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteId(t.id)} className="rounded-lg p-2 text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-400" title="Supprimer">
                      <Icon d={ICONS.trash} className="w-4 h-4" />
                    </button>
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

      {/* Delete confirmation modal */}
      {deleteId && (
        <Modal onClose={() => setDeleteId(null)}>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
              <Icon d={ICONS.trash} className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Supprimer ce témoignage ?</h3>
            <p className="mb-6 text-sm text-slate-400">Cette action est irréversible.</p>
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

// ─── Témoignage Form ──────────────────────────────────────────
function TemoignageForm({
  initial,
  types,
  evenements,
  saving,
  error,
  apiKey,
  onSave,
  onCancel,
}: {
  initial: Temoignage | null;
  types: TypeTemoignage[];
  evenements: Evenement[];
  saving: boolean;
  error: string;
  apiKey: string;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
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
  });
  const [uploading, setUploading] = useState(false);

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
  };

  function handleSubmit(e: React.FormEvent) {
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
    if (form.reponseContenu) {
      data.reponse = {
        auteur: form.reponseAuteur || "Insuffle",
        contenu: form.reponseContenu,
        date: form.reponseDate || new Date().toISOString().split("T")[0],
      };
    } else {
      data.reponse = null;
    }
    onSave(data);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>, field: "avatar" | "heroImage") {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", field === "avatar" ? "avatars" : "heroes");
    try {
      const res = await apiFetch("/api/upload", apiKey, { method: "POST", body: fd });
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
          <h1 className="text-3xl font-bold">{initial ? "Modifier" : "Nouveau"} témoignage</h1>
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
              <select value={form.evenementId} onChange={update("evenementId")} className={inputClass}>
                <option value="">— Aucun —</option>
                {evenements.map((ev) => <option key={ev.id} value={ev.id}>{ev.nom}</option>)}
              </select>
            </div>
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
            {saving ? "Enregistrement…" : initial ? "Mettre à jour" : "Créer"}
          </button>
          <button type="button" onClick={onCancel} className="rounded-xl bg-slate-800/50 px-5 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Types CRUD ───────────────────────────────────────────────
function TypesView({ apiKey }: { apiKey: string }) {
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

  const loadTypes = useCallback(() => {
    setLoading(true);
    fetch("/api/types").then((r) => r.json()).then((d) => {
      setTypes(d.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadTypes(); }, [loadTypes]);

  async function handleDelete(id: string) {
    const res = await apiFetch(`/api/types/${id}`, apiKey, { method: "DELETE" });
    if (res.ok) {
      setTypes((prev) => prev.filter((t) => t.id !== id));
      setDeleteId(null);
    }
  }

  if (loading) return <Loader />;

  if (creating || editing) {
    return <TypeForm initial={editing} apiKey={apiKey} onDone={() => { setEditing(null); setCreating(false); loadTypes(); }} onCancel={() => { setEditing(null); setCreating(false); }} />;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Types</h1>
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
function TypeForm({ initial, apiKey, onDone, onCancel }: { initial: TypeTemoignage | null; apiKey: string; onDone: () => void; onCancel: () => void }) {
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

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

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
    setChamps((prev) => [...prev, champ]);
    setNewChamp({ id: "", label: "", type: "text", required: false, placeholder: "", options: "" });
    setShowNewChamp(false);
  }

  function removeChamp(id: string) {
    setChamps((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const isEdit = !!initial;
    const url = isEdit ? `/api/types/${initial!.id}` : "/api/types";
    const method = isEdit ? "PUT" : "POST";
    const payload = { ...form, champs };
    try {
      const res = await apiFetch(url, apiKey, { method, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        setSaving(false);
        return;
      }
      onDone();
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
        <button onClick={onCancel} className="rounded-xl bg-slate-800/50 p-2.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
          <Icon d={ICONS.chevronLeft} className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold">{initial ? "Modifier" : "Nouveau"} type</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm md:p-8">
        {/* Basic info */}
        <fieldset>
          <legend className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Informations de base</legend>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>ID *</label>
              <input required value={form.id} onChange={update("id")} disabled={!!initial} className={`${inputClass} disabled:cursor-not-allowed disabled:text-slate-400`} placeholder="mon-type" />
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
              {champs.map((champ) => (
                <div key={champ.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-700/50 bg-slate-900/30 p-4">
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
                  <button
                    type="button"
                    onClick={() => removeChamp(champ.id)}
                    className="shrink-0 rounded-lg p-2 text-slate-500 transition-all hover:bg-red-500/10 hover:text-red-400"
                    title="Supprimer le champ"
                  >
                    <Icon d={ICONS.trash} className="w-4 h-4" />
                  </button>
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
              <h4 className="mb-3 text-sm font-semibold text-teal-400">Nouveau champ</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">ID *</label>
                  <input
                    value={newChamp.id}
                    onChange={(e) => setNewChamp((c) => ({ ...c, id: e.target.value }))}
                    className={inputClass}
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
                  Ajouter
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewChamp(false); setNewChamp({ id: "", label: "", type: "text", required: false, placeholder: "", options: "" }); }}
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
            {saving ? "Enregistrement…" : initial ? "Mettre à jour" : "Créer"}
          </button>
          <button type="button" onClick={onCancel} className="rounded-xl bg-slate-800/50 px-5 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Événements CRUD ──────────────────────────────────────────
function EvenementsView({ apiKey }: { apiKey: string }) {
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [types, setTypes] = useState<TypeTemoignage[]>([]);
  const [temoignages, setTemoignages] = useState<Temoignage[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Evenement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/evenements", apiKey).then((r) => r.json()),
      fetch("/api/types").then((r) => r.json()),
      fetch("/api/temoignages?limit=200").then((r) => r.json()),
    ]).then(([ev, tp, tm]) => {
      setEvenements(ev.data || []);
      setTypes(tp.data || []);
      setTemoignages(tm.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [apiKey]);

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

  async function handleDelete(id: string) {
    const res = await apiFetch(`/api/evenements/${id}`, apiKey, { method: "DELETE" });
    if (res.ok) {
      setEvenements((prev) => prev.filter((e) => e.id !== id));
      setDeleteId(null);
    }
  }

  async function toggleActive(evt: Evenement) {
    const res = await apiFetch(`/api/evenements/${evt.id}`, apiKey, {
      method: "PUT",
      body: JSON.stringify({ ...evt, actif: !evt.actif }),
    });
    if (res.ok) {
      setEvenements((prev) => prev.map((e) => e.id === evt.id ? { ...e, actif: !e.actif } : e));
    }
  }

  async function handleSave(data: Record<string, unknown>) {
    const isEdit = !!editing;
    const url = isEdit ? `/api/evenements/${editing!.id}` : "/api/evenements";
    const method = isEdit ? "PUT" : "POST";
    const res = await apiFetch(url, apiKey, { method, body: JSON.stringify(data) });
    if (res.ok) {
      loadData();
      setEditing(null);
      setCreating(false);
    }
  }

  if (loading) return <Loader />;

  if (creating || editing) {
    return (
      <EvenementForm
        initial={editing}
        types={types}
        onSave={handleSave}
        onCancel={() => { setEditing(null); setCreating(false); }}
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
          <h1 className="text-3xl font-bold">Événements</h1>
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
    </div>
  );
}

// ─── Événement Form ───────────────────────────────────────────
function EvenementForm({
  initial,
  types,
  onSave,
  onCancel,
}: {
  initial: Evenement | null;
  types: TypeTemoignage[];
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    nom: initial?.nom || "",
    description: initial?.description || "",
    typeId: initial?.typeId || (types[0]?.id ?? ""),
    date: initial?.date || new Date().toISOString().split("T")[0],
    lieu: initial?.lieu || "",
    marque: initial?.marque || "insuffle",
    actif: initial?.actif ?? true,
  });

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
  };

  const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none transition-all placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";
  const labelClass = "mb-2 block text-sm font-medium text-slate-300";

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <button onClick={onCancel} className="rounded-xl bg-slate-800/50 p-2.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
          <Icon d={ICONS.chevronLeft} className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">{initial ? "Modifier" : "Nouvel"} événement</h1>
          <p className="mt-1 text-sm text-slate-400">{initial ? `Édition de ${initial.nom}` : "Créer un nouvel événement"}</p>
        </div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); onSave(form); }}
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Type de témoignage *</label>
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
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:from-teal-400 hover:to-cyan-400">
            {initial ? "Mettre à jour" : "Créer"}
          </button>
          <button type="button" onClick={onCancel} className="rounded-xl bg-slate-800/50 px-5 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Invitations ──────────────────────────────────────────────
function InvitationsView({ apiKey }: { apiKey: string }) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [types, setTypes] = useState<TypeTemoignage[]>([]);
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/invitations", apiKey).then((r) => r.json()),
      fetch("/api/types").then((r) => r.json()),
      apiFetch("/api/evenements", apiKey).then((r) => r.json()),
    ]).then(([inv, tp, ev]) => {
      setInvitations(inv.data || []);
      setTypes(tp.data || []);
      setEvenements(ev.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [apiKey]);

  useEffect(() => { loadData(); }, [loadData]);

  function copyLink(id: string) {
    const url = `${window.location.origin}/temoignages/nouveau?token=${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function shareLink(inv: Invitation) {
    const url = `${window.location.origin}/temoignages/nouveau?token=${inv.id}`;
    const subject = encodeURIComponent("Votre avis compte — partagez votre expérience");
    const body = encodeURIComponent(
      `Bonjour${inv.nom ? " " + inv.nom : ""},\n\n${inv.message || "Nous aimerions recueillir votre témoignage sur votre expérience avec Insuffle."}\n\nCliquez ici pour partager votre avis :\n${url}\n\nMerci !\nL'équipe Insuffle`
    );
    const mailto = inv.email
      ? `mailto:${inv.email}?subject=${subject}&body=${body}`
      : `mailto:?subject=${subject}&body=${body}`;
    window.open(mailto);
  }

  async function handleDelete(id: string) {
    const res = await apiFetch(`/api/invitations/${id}`, apiKey, { method: "DELETE" });
    if (res.ok) {
      setInvitations((prev) => prev.filter((i) => i.id !== id));
      setDeleteId(null);
    }
  }

  async function handleCreate(data: Record<string, string>) {
    const res = await apiFetch("/api/invitations", apiKey, { method: "POST", body: JSON.stringify(data) });
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
          <h1 className="text-3xl font-bold">Invitations</h1>
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
                        onClick={() => shareLink(inv)}
                        className="flex items-center gap-1.5 rounded-lg bg-teal-500/20 px-3 py-2 text-xs font-medium text-teal-400 transition-colors hover:bg-teal-500/30"
                      >
                        <Icon d={ICONS.mail} className="w-3.5 h-3.5" />
                        Envoyer
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

  const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none transition-all placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <button onClick={onCancel} className="rounded-xl bg-slate-800/50 p-2.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
          <Icon d={ICONS.chevronLeft} className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">Nouvelle invitation</h1>
          <p className="mt-1 text-sm text-slate-400">Créez un lien unique pour votre client</p>
        </div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); onSave(form); }}
        className="max-w-xl space-y-4 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm md:p-8"
      >
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
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">Événement (optionnel)</label>
          <select value={form.evenementId} onChange={update("evenementId")} className={inputClass}>
            <option value="">— Aucun —</option>
            {evenements.filter((e) => e.actif).map((ev) => <option key={ev.id} value={ev.id}>{ev.nom}</option>)}
          </select>
        </div>
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
function BackupView({ apiKey }: { apiKey: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setStatus("loading");
    setMessage("");
    try {
      const res = await apiFetch("/api/backup", apiKey);
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
    setStatus("loading");
    setMessage("");
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await apiFetch("/api/backup", apiKey, { method: "POST", body: JSON.stringify(json) });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Erreur lors de la restauration");
        return;
      }
      setStatus("success");
      setMessage(data.message || "Restauration effectuée");
    } catch {
      setStatus("error");
      setMessage("Fichier JSON invalide");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Sauvegarde</h1>
        <p className="mt-1 text-sm text-slate-400">Exporter ou restaurer vos données</p>
      </div>

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
          <p className="mb-6 text-sm text-slate-400">
            Importer un fichier de backup JSON. Les données actuelles seront remplacées.
          </p>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-slate-700/50 bg-slate-800 p-6" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
