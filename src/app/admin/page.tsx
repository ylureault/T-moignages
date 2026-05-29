"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Temoignage, TypeTemoignage } from "@/types";

type View = "dashboard" | "temoignages" | "types" | "backup";

const SOURCES = ["google", "trustpilot", "linkedin", "site", "autre"] as const;
const MARQUES = ["insuffle", "academie"] as const;

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
        {view === "backup" && <BackupView apiKey={apiKey} />}
      </main>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────
function DashboardView({ apiKey, onNav }: { apiKey: string; onNav: (v: View) => void }) {
  const [temoignages, setTemoignages] = useState<Temoignage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/temoignages?limit=50")
      .then((r) => r.json())
      .then((d) => { setTemoignages(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const avg = temoignages.length > 0 ? temoignages.reduce((s, t) => s + t.note, 0) / temoignages.length : 0;
  const verified = temoignages.filter((t) => t.verifie).length;
  const insuffle = temoignages.filter((t) => t.marque === "insuffle").length;
  const academie = temoignages.filter((t) => t.marque === "academie").length;

  const stats = [
    { label: "Témoignages", value: temoignages.length, color: "blue" },
    { label: "Note moyenne", value: avg.toFixed(1) + "/5", color: "amber" },
    { label: "Vérifiés", value: verified, color: "teal" },
    { label: "Insuffle", value: insuffle, color: "purple" },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/20 text-blue-400",
    amber: "bg-amber-500/20 text-amber-400",
    teal: "bg-teal-500/20 text-teal-400",
    purple: "bg-purple-500/20 text-purple-400",
  };

  const recent = [...temoignages].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Tableau de bord</h1>
        <p className="mt-1 text-sm text-slate-400">Vue d&apos;ensemble de vos témoignages</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorMap[s.color]}`}>
                <Icon d={ICONS.star} className="w-5 h-5" />
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
    ]).then(([td, tp]) => {
      setTemoignages(td.data || []);
      setTypes(tp.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

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
        saving={saving}
        error={error}
        apiKey={apiKey}
        onSave={handleSave}
        onCancel={() => { setEditing(null); setCreating(false); setError(""); }}
      />
    );
  }

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
                <td className="px-4 py-4 text-sm text-slate-400">{t.date}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1">
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
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Aucun témoignage trouvé</td></tr>
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
  saving,
  error,
  apiKey,
  onSave,
  onCancel,
}: {
  initial: Temoignage | null;
  types: TypeTemoignage[];
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
    date: initial?.date || new Date().toISOString().split("T")[0],
    heroImage: initial?.heroImage || "",
    reponseAuteur: initial?.reponse?.auteur || "",
    reponseContenu: initial?.reponse?.contenu || "",
    reponseDate: initial?.reponse?.date || "",
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
      date: form.date,
    };
    if (form.heroImage) data.heroImage = form.heroImage;
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
          <div className="mt-4 grid gap-4 md:grid-cols-2">
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
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const isEdit = !!initial;
    const url = isEdit ? `/api/types/${initial!.id}` : "/api/types";
    const method = isEdit ? "PUT" : "POST";
    try {
      const res = await apiFetch(url, apiKey, { method, body: JSON.stringify(form) });
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

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <button onClick={onCancel} className="rounded-xl bg-slate-800/50 p-2.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
          <Icon d={ICONS.chevronLeft} className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold">{initial ? "Modifier" : "Nouveau"} type</h1>
      </div>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm md:p-8">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">ID *</label>
          <input required value={form.id} onChange={update("id")} disabled={!!initial} className={`${inputClass} disabled:cursor-not-allowed disabled:text-slate-400`} placeholder="mon-type" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">Label *</label>
          <input required value={form.label} onChange={update("label")} className={inputClass} placeholder="Mon type" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">Description</label>
          <textarea value={form.description} onChange={update("description")} rows={3} className={`${inputClass} resize-none`} placeholder="Description du type" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Icône</label>
            <input value={form.icon} onChange={update("icon")} className={inputClass} placeholder="star" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Couleur</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.color} onChange={update("color")} className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent" />
              <input value={form.color} onChange={update("color")} className={inputClass} />
            </div>
          </div>
        </div>
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
