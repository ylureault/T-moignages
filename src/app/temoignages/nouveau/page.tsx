"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";

type Status = "idle" | "loading" | "success" | "error";

export default function NouveauTemoignagePage() {
  const [note, setNote] = useState(0);
  const [hover, setHover] = useState(0);
  const [form, setForm] = useState({
    auteur: "",
    poste: "",
    entreprise: "",
    email: "",
    marque: "insuffle",
    contenu: "",
  });
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const update = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    if (note < 1) {
      setStatus("error");
      setMessage("Merci de choisir une note.");
      return;
    }

    try {
      const res = await fetch("/api/temoignages/soumettre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Une erreur est survenue.");
        return;
      }
      setStatus("success");
      setMessage(data.message);
    } catch {
      setStatus("error");
      setMessage("Connexion impossible. Réessayez.");
    }
  }

  const labels = ["", "Décevant", "Moyen", "Correct", "Très bien", "Excellent"];

  if (status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand px-6">
        <div className="animate-fade-up w-full max-w-md rounded-3xl border border-line bg-paper p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-accent">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold text-ink">Merci infiniment&nbsp;!</h1>
          <p className="mt-3 leading-relaxed text-muted">{message}</p>
          <a href="/temoignages" className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-semibold text-white transition-all hover:bg-accent">
            Voir les témoignages
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand">
      {/* En-tête simple */}
      <div className="border-b border-line bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Logo />
          <a href="/temoignages" className="text-sm font-medium text-muted transition-colors hover:text-ink">
            Retour
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-12 md:py-16">
        <div className="animate-fade-up text-center">
          <h1 className="font-display text-3xl font-bold leading-tight text-ink md:text-4xl">
            Partagez votre <span className="accent-underline text-accent">expérience</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Votre retour aide d&apos;autres dirigeants à franchir le pas. Sans
            langue de bois.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="animate-fade-up delay-1 mt-10 rounded-3xl border border-line bg-paper p-6 md:p-8"
        >
          {/* Étoiles */}
          <div className="mb-8 text-center">
            <label className="mb-3 block text-sm font-semibold text-ink">
              Votre note
            </label>
            <div className="flex items-center justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setNote(i)}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(0)}
                  className="transition-transform hover:scale-110"
                  aria-label={`${i} étoile${i > 1 ? "s" : ""}`}
                >
                  <svg
                    width="38"
                    height="38"
                    viewBox="0 0 20 20"
                    fill={i <= (hover || note) ? "var(--color-accent)" : "none"}
                    stroke={i <= (hover || note) ? "var(--color-accent)" : "var(--color-line)"}
                    strokeWidth={1.5}
                  >
                    <path d="M10 1.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L10 14.9l-5.25 2.8 1-5.85L1.5 7.65l5.9-.85L10 1.5z" />
                  </svg>
                </button>
              ))}
            </div>
            <p className="mt-2 h-5 text-sm font-medium text-accent">
              {labels[hover || note]}
            </p>
          </div>

          {/* Champs */}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nom complet" required>
              <input
                required
                value={form.auteur}
                onChange={update("auteur")}
                maxLength={200}
                className="input"
                placeholder="Marie Dupont"
              />
            </Field>
            <Field label="Email (privé)">
              <input
                type="email"
                value={form.email}
                onChange={update("email")}
                className="input"
                placeholder="marie@entreprise.com"
              />
            </Field>
            <Field label="Poste">
              <input
                value={form.poste}
                onChange={update("poste")}
                maxLength={200}
                className="input"
                placeholder="Directrice Générale"
              />
            </Field>
            <Field label="Entreprise">
              <input
                value={form.entreprise}
                onChange={update("entreprise")}
                maxLength={200}
                className="input"
                placeholder="Votre société"
              />
            </Field>
          </div>

          <div className="mt-5">
            <Field label="À quel sujet ?">
              <select value={form.marque} onChange={update("marque")} className="input">
                <option value="insuffle">Conseil & accompagnement (Insuffle)</option>
                <option value="academie">Formation (Insuffle Académie)</option>
              </select>
            </Field>
          </div>

          <div className="mt-5">
            <Field label="Votre témoignage" required>
              <textarea
                required
                value={form.contenu}
                onChange={update("contenu")}
                rows={5}
                maxLength={5000}
                minLength={10}
                className="input resize-none"
                placeholder="Qu'est-ce qui a réellement changé pour votre organisation ?"
              />
              <span className="mt-1 block text-right text-xs text-muted-soft">
                {form.contenu.length}/5000
              </span>
            </Field>
          </div>

          {status === "error" && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-4 font-semibold text-white transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Envoi…
              </>
            ) : (
              <>
                Envoyer mon témoignage
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>
          <p className="mt-4 text-center text-xs text-muted-soft">
            Votre témoignage sera relu par notre équipe avant publication.
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        {required && <span className="text-accent"> *</span>}
      </span>
      {children}
    </label>
  );
}
