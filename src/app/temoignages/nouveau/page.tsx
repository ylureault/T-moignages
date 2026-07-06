"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import type { NoteStyle, ChampPersonnalise } from "@/types";

type Status = "idle" | "loading" | "success" | "error";

interface TypeInfo {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  noteStyle: NoteStyle;
  champs: ChampPersonnalise[];
}

interface EventInfo {
  id: string;
  nom: string;
  description: string;
  typeId: string;
  entreprise?: string;
  bannerImage?: string;
  date: string;
  lieu?: string;
  marque: "insuffle" | "academie";
  actif: boolean;
}

export default function NouveauTemoignagePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-dark"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent/30 border-t-accent" /></div>}>
      <NouveauTemoignageContent />
    </Suspense>
  );
}

function NouveauTemoignageContent() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const marqueParam = searchParams.get("marque");
  const tokenParam = searchParams.get("token");
  const eventParam = searchParams.get("event");

  const [note, setNote] = useState(0);
  const [hover, setHover] = useState(0);
  const [form, setForm] = useState({
    auteur: "",
    poste: "",
    entreprise: "",
    email: "",
    marque: marqueParam === "academie" ? "academie" : "insuffle",
    contenu: "",
  });
  const [champsValues, setChampsValues] = useState<Record<string, unknown>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const [typeInfo, setTypeInfo] = useState<TypeInfo | null>(null);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [allTypes, setAllTypes] = useState<TypeInfo[]>([]);
  const [selectedType, setSelectedType] = useState<string>(typeParam || "");
  const [typesLoaded, setTypesLoaded] = useState(false);
  const [invitationMessage, setInvitationMessage] = useState("");
  const [invitationUsed, setInvitationUsed] = useState(false);
  const [eventInactive, setEventInactive] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  // UX minimale : les détails facultatifs (poste, email) et les questions
  // spécifiques sont repliés — le client voit note + texte + nom, c'est tout.
  const [showExtra, setShowExtra] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [editIdentity, setEditIdentity] = useState(false);

  useEffect(() => {
    const init = async () => {
      const typesRes = await fetch("/api/types").then((r) => r.json()).catch(() => ({ data: [] }));
      const types: TypeInfo[] = (typesRes.data || []).map((t: TypeInfo) => ({
        ...t,
        noteStyle: t.noteStyle || "stars",
        champs: t.champs || [],
      }));
      setAllTypes(types);

      if (eventParam) {
        const evtRes = await fetch(`/api/evenements/${eventParam}`).then((r) => r.json()).catch(() => null);
        if (evtRes?.success && evtRes.data) {
          const evt = evtRes.data as EventInfo;
          if (!evt.actif) { setEventInactive(true); setTypesLoaded(true); return; }
          setEventInfo(evt);
          setForm((f) => ({ ...f, marque: evt.marque || f.marque, entreprise: evt.entreprise || f.entreprise }));
          setShareUrl(`${window.location.origin}/temoignages/nouveau?event=${evt.id}`);
          if (evtRes.type) {
            const t = { ...evtRes.type, noteStyle: evtRes.type.noteStyle || "stars", champs: evtRes.type.champs || [] };
            setTypeInfo(t);
            setSelectedType(t.id);
          }
        }
      } else if (tokenParam) {
        const invRes = await fetch(`/api/invitations/${tokenParam}`).then((r) => r.json()).catch(() => null);
        if (invRes?.success && invRes.data) {
          const inv = invRes.data;
          if (inv.used) { setInvitationUsed(true); setTypesLoaded(true); return; }
          setForm((f) => ({
            ...f,
            auteur: inv.nom || f.auteur,
            email: inv.email || f.email,
            entreprise: inv.entreprise || f.entreprise,
            marque: inv.marque || f.marque,
          }));
          if (inv.message) setInvitationMessage(inv.message);
          if (inv.evenementId) {
            const evtRes = await fetch(`/api/evenements/${inv.evenementId}`).then((r) => r.json()).catch(() => null);
            if (evtRes?.success && evtRes.data) {
              setEventInfo(evtRes.data);
              setShareUrl(`${window.location.origin}/temoignages/nouveau?event=${evtRes.data.id}`);
              if (evtRes.type) {
                const t = { ...evtRes.type, noteStyle: evtRes.type.noteStyle || "stars", champs: evtRes.type.champs || [] };
                setTypeInfo(t);
                setSelectedType(t.id);
              }
            }
          } else if (inv.type) {
            setSelectedType(inv.type);
            const found = types.find((t) => t.id === inv.type);
            if (found) setTypeInfo(found);
          }
        }
      } else if (typeParam) {
        const found = types.find((t) => t.id === typeParam);
        if (found) { setTypeInfo(found); setSelectedType(found.id); }
      }

      setTypesLoaded(true);
    };
    init();
  }, [typeParam, tokenParam, eventParam]);

  const update = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const updateChamp = (champId: string, value: unknown) => {
    setChampsValues((prev) => ({ ...prev, [champId]: value }));
  };

  // Thème selon la marque : Académie = univers violet/or + police Outfit.
  const themeClass = form.marque === "academie" ? "theme-academie" : "";
  // Site de la marque (pas de vitrine publique d'avis : on renvoie au site).
  const siteUrl = form.marque === "academie" ? "https://insuffle-academie.com" : "https://insuffle.com";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    if (note < 1) {
      setStatus("error");
      setMessage("Merci de choisir une note.");
      return;
    }

    // Les questions spécifiques ne bloquent jamais un feedback rapide :
    // leurs champs requis ne comptent que si la section a été ouverte.
    const requiredChamps = showQuestions
      ? typeInfo?.champs.filter((c) => c.required) || []
      : [];
    for (const champ of requiredChamps) {
      const val = champsValues[champ.id];
      if (!val || (typeof val === "string" && !val.trim())) {
        setStatus("error");
        setMessage(`Le champ "${champ.label}" est requis.`);
        return;
      }
    }

    try {
      const payload: Record<string, unknown> = {
        ...form,
        note,
        type: selectedType === "_general" ? undefined : selectedType || undefined,
      };
      if (eventInfo) payload.evenementId = eventInfo.id;
      if (Object.keys(champsValues).length > 0) payload.champsPersonnalises = champsValues;

      const res = await fetch("/api/temoignages/soumettre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Une erreur est survenue.");
        return;
      }
      if (tokenParam) {
        fetch(`/api/invitations/${tokenParam}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ used: true }),
        }).catch(() => {});
      }
      if (!shareUrl && eventInfo) {
        setShareUrl(`${window.location.origin}/temoignages/nouveau?event=${eventInfo.id}`);
      }
      setStatus("success");
      setMessage(data.message);
    } catch {
      setStatus("error");
      setMessage("Connexion impossible. Réessayez.");
    }
  }

  const noteStyle: NoteStyle = typeInfo?.noteStyle || "stars";
  // Identité déjà connue via l'invitation : on l'affiche en résumé au lieu
  // de re-demander — le formulaire se réduit à la note et au témoignage.
  const identitePrefilled = Boolean(tokenParam) && form.auteur.trim().length > 0;
  // Feedback rapide avant tout : une note + un commentaire suffisent TOUJOURS.
  // Les questions spécifiques restent repliées (leurs champs requis ne
  // s'appliquent que si le client choisit d'ouvrir la section).
  const questionsVisibles = showQuestions;

  if (invitationUsed) {
    return (
      <div className={`${themeClass} flex min-h-screen items-center justify-center bg-dark px-6`}>
        <div className="animate-fade-up w-full max-w-md rounded-3xl border border-line bg-card p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-accent">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold text-ink">Déjà complété</h1>
          <p className="mt-3 leading-relaxed text-muted">Ce lien a déjà été utilisé pour soumettre un témoignage. Merci !</p>
          <a href={siteUrl} className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-all hover:bg-primary-light">
            Retour au site
          </a>
        </div>
      </div>
    );
  }

  if (eventInactive) {
    return (
      <div className={`${themeClass} flex min-h-screen items-center justify-center bg-dark px-6`}>
        <div className="animate-fade-up w-full max-w-md rounded-3xl border border-line bg-card p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted/10">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-muted">
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold text-ink">Collecte terminée</h1>
          <p className="mt-3 leading-relaxed text-muted">La collecte de témoignages pour cet événement est terminée. Merci de votre intérêt !</p>
          <a href={siteUrl} className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-all hover:bg-primary-light">
            Retour au site
          </a>
        </div>
      </div>
    );
  }

  if (status === "success") {
    const currentShareUrl = shareUrl || (eventInfo ? `${window.location.origin}/temoignages/nouveau?event=${eventInfo.id}` : "");
    return (
      <div className={`${themeClass} flex min-h-screen items-center justify-center bg-dark px-6`}>
        <div className="animate-fade-up w-full max-w-md rounded-3xl border border-line bg-card p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-accent">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold text-ink">Merci infiniment&nbsp;!</h1>
          <p className="mt-3 leading-relaxed text-muted">{message}</p>

          {currentShareUrl && (
            <div className="mt-8 rounded-2xl border border-line bg-dark/50 p-5">
              <p className="mb-3 text-sm font-semibold text-ink">Partagez avec vos collègues</p>
              <p className="mb-4 text-xs text-muted">Invitez-les à partager aussi leur expérience</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <ShareCopyButton url={currentShareUrl} />
                <a
                  href={`mailto:?subject=${encodeURIComponent("Partagez votre expérience")}&body=${encodeURIComponent(`Bonjour,\n\nJe viens de partager mon témoignage et je vous invite à faire de même :\n${currentShareUrl}\n\nMerci !`)}`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-line px-4 py-3 text-sm font-medium text-ink transition-all hover:bg-white/5"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email
                </a>
              </div>
            </div>
          )}

          <a href={siteUrl} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-all hover:bg-primary-light">
            Retour au site
          </a>
        </div>
      </div>
    );
  }

  if (typesLoaded && !selectedType && allTypes.length > 0 && !typeParam && !eventParam) {
    return (
      <div className={`${themeClass} min-h-screen bg-dark`}>
        <div className="border-b border-line bg-dark/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
            <Logo />
            <a href={siteUrl} className="text-sm font-medium text-muted transition-colors hover:text-ink">
              Retour
            </a>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 md:py-16">
          <div className="animate-fade-up text-center">
            <h1 className="font-display text-2xl font-bold leading-tight text-ink sm:text-3xl md:text-4xl">
              Partagez votre <span className="accent-underline text-accent">expérience</span>
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted sm:text-base">
              Choisissez le type de témoignage qui correspond le mieux.
            </p>
          </div>

          <div className="animate-fade-up delay-1 mt-8 grid gap-3 sm:mt-10 sm:gap-4 sm:grid-cols-2">
            {allTypes.map((t) => (
              <button
                key={t.id}
                onClick={() => { setSelectedType(t.id); setTypeInfo(t); }}
                className="group rounded-2xl border border-line bg-card p-6 text-left transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-lg"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-lg" style={{ backgroundColor: t.color + "1a", color: t.color }}>
                  <TypeIcon icon={t.icon} />
                </div>
                <h3 className="font-display font-semibold text-ink transition-colors group-hover:text-accent">{t.label}</h3>
                <p className="mt-1 text-sm text-muted">{t.description}</p>
              </button>
            ))}
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => setSelectedType("_general")}
              className="text-sm font-medium text-muted transition-colors hover:text-accent"
            >
              Continuer sans choisir →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${themeClass} min-h-screen bg-dark`}>
      <div className="border-b border-line bg-dark/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Logo />
          <a href={siteUrl} className="text-sm font-medium text-muted transition-colors hover:text-ink">
            Retour
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 md:py-16">
        {eventInfo?.bannerImage && (
          <div className="animate-fade-up mb-8 overflow-hidden rounded-2xl border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={eventInfo.bannerImage} alt={eventInfo.nom} className="h-40 w-full object-cover sm:h-56" />
          </div>
        )}
        <div className="animate-fade-up text-center">
          {eventInfo ? (
            <>
              {typeInfo && (
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-xl" style={{ backgroundColor: typeInfo.color + "1a", color: typeInfo.color }}>
                  <TypeIcon icon={typeInfo.icon} />
                </div>
              )}
              <h1 className="font-display text-2xl font-bold leading-tight text-ink sm:text-3xl md:text-4xl">
                {eventInfo.nom}
              </h1>
              {eventInfo.entreprise && (
                <p className="mt-2 text-sm font-medium text-accent">{eventInfo.entreprise}</p>
              )}
              <p className="mx-auto mt-3 max-w-md text-sm text-muted sm:text-base">{eventInfo.description || typeInfo?.description}</p>
              {eventInfo.lieu && (
                <p className="mt-2 text-sm text-muted-soft">{eventInfo.lieu} · {eventInfo.date}</p>
              )}
            </>
          ) : typeInfo ? (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-xl" style={{ backgroundColor: typeInfo.color + "1a", color: typeInfo.color }}>
                <TypeIcon icon={typeInfo.icon} />
              </div>
              <h1 className="font-display text-2xl font-bold leading-tight text-ink sm:text-3xl md:text-4xl">
                {typeInfo.label}
              </h1>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted sm:text-base">{typeInfo.description}</p>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold leading-tight text-ink sm:text-3xl md:text-4xl">
                Partagez votre <span className="accent-underline text-accent">expérience</span>
              </h1>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted sm:text-base">
                Votre retour aide d&apos;autres dirigeants à franchir le pas. Sans
                langue de bois.
              </p>
            </>
          )}
          {invitationMessage && (
            <div className="mx-auto mt-6 max-w-md rounded-2xl border border-accent/15 bg-accent/5 px-5 py-4 text-sm leading-relaxed text-ink/80">
              {invitationMessage}
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="animate-fade-up delay-1 mt-8 rounded-2xl border border-line bg-card p-4 sm:mt-10 sm:rounded-3xl sm:p-6 md:p-8"
        >
          {/* Note principale */}
          <div className="mb-8 text-center">
            <label className="mb-3 block text-sm font-semibold text-ink">
              Votre note globale
            </label>
            <NoteInput
              style={noteStyle}
              value={note}
              hover={hover}
              onChange={setNote}
              onHover={setHover}
            />
          </div>

          {/* L'essentiel d'abord : le témoignage lui-même */}
          <div>
            <Field label="Votre témoignage" required>
              <textarea
                required
                value={form.contenu}
                onChange={update("contenu")}
                rows={5}
                maxLength={5000}
                minLength={10}
                className="input resize-none"
                placeholder="Qu'est-ce qui a réellement changé pour vous ou votre organisation ?"
              />
              <span className="mt-1 block text-right text-xs text-muted-soft">
                {form.contenu.length}/5000
              </span>
            </Field>
          </div>

          {/* Qui témoigne — résumé compact si déjà connu via l'invitation */}
          {identitePrefilled && !editIdentity ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-dark/40 px-4 py-3">
              <p className="text-sm text-ink">
                Vous témoignez en tant que <strong>{form.auteur}</strong>
                {form.entreprise && <span className="text-muted"> · {form.entreprise}</span>}
              </p>
              <button
                type="button"
                onClick={() => setEditIdentity(true)}
                className="text-xs font-semibold text-accent transition-opacity hover:opacity-80"
              >
                Modifier
              </button>
            </div>
          ) : (
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
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
          )}

          {/* Détails facultatifs repliés : poste + email */}
          <div className="mt-4">
            {!showExtra ? (
              <button
                type="button"
                onClick={() => setShowExtra(true)}
                className="text-sm font-medium text-muted transition-colors hover:text-accent"
              >
                + Ajouter mon poste ou mon email <span className="text-muted-soft">(facultatif)</span>
              </button>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Poste">
                  <input
                    value={form.poste}
                    onChange={update("poste")}
                    maxLength={200}
                    className="input"
                    placeholder="Directrice Générale"
                  />
                </Field>
                <Field label="Email (privé, jamais publié)">
                  <input
                    type="email"
                    value={form.email}
                    onChange={update("email")}
                    className="input"
                    placeholder="marie@entreprise.com"
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Contexte — uniquement en accès libre (jamais via invitation/événement) */}
          {!eventInfo && !tokenParam && (
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field label="À quel sujet ?">
                <select value={form.marque} onChange={update("marque")} className="input">
                  <option value="insuffle">Conseil & accompagnement (Insuffle)</option>
                  <option value="academie">Formation (Insuffle Académie)</option>
                </select>
              </Field>
              {!typeParam && allTypes.length > 0 && (
                <Field label="Type de témoignage">
                  <select
                    value={selectedType}
                    onChange={(e) => {
                      setSelectedType(e.target.value);
                      const found = allTypes.find((t) => t.id === e.target.value);
                      setTypeInfo(found || null);
                      setChampsValues({});
                    }}
                    className="input"
                  >
                    <option value="">— Général —</option>
                    {allTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
          )}

          {/* Questions spécifiques : visibles si obligatoires, sinon sur demande */}
          {typeInfo && typeInfo.champs.length > 0 && (
            questionsVisibles ? (
              <div className="mt-8 space-y-5 border-t border-line pt-8">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-soft">
                    Pour aller plus loin (facultatif)
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowQuestions(false)}
                    className="text-xs font-medium text-muted transition-colors hover:text-accent"
                  >
                    Réduire
                  </button>
                </div>
                {typeInfo.champs.map((champ) => (
                  <ChampField
                    key={champ.id}
                    champ={champ}
                    noteStyle={noteStyle}
                    value={champsValues[champ.id]}
                    onChange={(val) => updateChamp(champ.id, val)}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-6 border-t border-line pt-5">
                <button
                  type="button"
                  onClick={() => setShowQuestions(true)}
                  className="text-sm font-medium text-muted transition-colors hover:text-accent"
                >
                  + Répondre à {typeInfo.champs.length} question{typeInfo.champs.length > 1 ? "s" : ""} bonus <span className="text-muted-soft">(facultatif)</span>
                </button>
              </div>
            )
          )}

          {status === "error" && (
            <p className="mt-4 rounded-xl bg-red-500/20 px-4 py-3 text-sm font-medium text-red-300">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-4 font-semibold text-white transition-all hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
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

// ─── Note Input Variants ─────────────────────────────────────
function NoteInput({
  style,
  value,
  hover,
  onChange,
  onHover,
}: {
  style: NoteStyle;
  value: number;
  hover: number;
  onChange: (n: number) => void;
  onHover: (n: number) => void;
}) {
  if (style === "smileys") return <SmileyInput value={value} onChange={onChange} />;
  if (style === "scale") return <ScaleInput value={value} onChange={onChange} />;
  if (style === "thumbs") return <ThumbsInput value={value} onChange={onChange} />;
  return <StarsInput value={value} hover={hover} onChange={onChange} onHover={onHover} />;
}

function StarsInput({ value, hover, onChange, onHover }: { value: number; hover: number; onChange: (n: number) => void; onHover: (n: number) => void }) {
  const labels = ["", "Décevant", "Moyen", "Correct", "Très bien", "Excellent"];
  return (
    <div>
      <div className="flex items-center justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            onMouseEnter={() => onHover(i)}
            onMouseLeave={() => onHover(0)}
            className="transition-transform hover:scale-110"
            aria-label={`${i} étoile${i > 1 ? "s" : ""}`}
          >
            <svg
              width="38"
              height="38"
              viewBox="0 0 20 20"
              fill={i <= (hover || value) ? "var(--color-accent)" : "none"}
              stroke={i <= (hover || value) ? "var(--color-accent)" : "var(--color-line)"}
              strokeWidth={1.5}
            >
              <path d="M10 1.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L10 14.9l-5.25 2.8 1-5.85L1.5 7.65l5.9-.85L10 1.5z" />
            </svg>
          </button>
        ))}
      </div>
      <p className="mt-2 h-5 text-sm font-medium text-accent">
        {labels[hover || value]}
      </p>
    </div>
  );
}

function SmileyInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const smileys = [
    { emoji: "😡", label: "Très insatisfait", color: "#ef4444" },
    { emoji: "😕", label: "Insatisfait", color: "#f97316" },
    { emoji: "😐", label: "Neutre", color: "#eab308" },
    { emoji: "🙂", label: "Satisfait", color: "#22c55e" },
    { emoji: "😊", label: "Très satisfait", color: "#10b981" },
  ];
  return (
    <div>
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {smileys.map((s, i) => {
          const n = i + 1;
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl transition-all sm:h-14 sm:w-14 sm:rounded-2xl sm:text-2xl ${
                active
                  ? "scale-110"
                  : "opacity-50 hover:opacity-80 hover:scale-105"
              }`}
              style={active ? { backgroundColor: s.color + "22", outlineColor: s.color, outlineWidth: 2, outlineStyle: "solid" } : {}}
              aria-label={s.label}
            >
              {s.emoji}
            </button>
          );
        })}
      </div>
      <p className="mt-2 h-5 text-sm font-medium text-accent">
        {value > 0 ? smileys[value - 1].label : ""}
      </p>
    </div>
  );
}

function ScaleInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const mapped = value === 0 ? 0 : Math.round(value * 2);
  const setFromScale = (n: number) => onChange(Math.max(1, Math.min(5, Math.round(n / 2))));

  return (
    <div>
      <div className="grid grid-cols-5 gap-1.5 sm:flex sm:items-center sm:justify-center sm:gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setFromScale(n)}
            className={`flex h-10 w-full items-center justify-center rounded-lg text-sm font-bold transition-all sm:h-10 sm:w-10 ${
              n <= mapped
                ? "bg-accent text-dark"
                : "bg-white/5 text-muted hover:bg-white/10"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-soft">
        <span>Pas du tout</span>
        <span>Excellent</span>
      </div>
    </div>
  );
}

function ThumbsInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-center gap-4 sm:gap-6">
        <button
          type="button"
          onClick={() => onChange(2)}
          className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl transition-all sm:h-16 sm:w-16 sm:text-3xl ${
            value === 2
              ? "scale-110 bg-red-500/20 ring-2 ring-red-500 ring-offset-2 ring-offset-dark"
              : "bg-white/5 opacity-50 hover:opacity-80 hover:scale-105"
          }`}
          aria-label="Non recommandé"
        >
          👎
        </button>
        <button
          type="button"
          onClick={() => onChange(5)}
          className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl transition-all sm:h-16 sm:w-16 sm:text-3xl ${
            value === 5
              ? "scale-110 bg-emerald-500/20 ring-2 ring-emerald-500 ring-offset-2 ring-offset-dark"
              : "bg-white/5 opacity-50 hover:opacity-80 hover:scale-105"
          }`}
          aria-label="Recommandé"
        >
          👍
        </button>
      </div>
      <p className="mt-2 h-5 text-sm font-medium text-accent">
        {value === 2 ? "Non recommandé" : value === 5 ? "Recommandé" : ""}
      </p>
    </div>
  );
}

// ─── Mini Note Input (for custom fields of type "note") ──────
function MiniNoteInput({ style, value, onChange }: { style: NoteStyle; value: number; onChange: (n: number) => void }) {
  if (style === "smileys") {
    const smileys = ["😡", "😕", "😐", "🙂", "😊"];
    return (
      <div className="flex items-center gap-2">
        {smileys.map((s, i) => {
          const n = i + 1;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-all ${
                value === n ? "scale-110 bg-accent/20 ring-1 ring-accent" : "opacity-40 hover:opacity-70"
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className="transition-transform hover:scale-110"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 20 20"
            fill={i <= value ? "var(--color-accent)" : "none"}
            stroke={i <= value ? "var(--color-accent)" : "var(--color-line)"}
            strokeWidth={1.5}
          >
            <path d="M10 1.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L10 14.9l-5.25 2.8 1-5.85L1.5 7.65l5.9-.85L10 1.5z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

// ─── Custom Field Renderer ───────────────────────────────────
function ChampField({
  champ,
  noteStyle,
  value,
  onChange,
}: {
  champ: ChampPersonnalise;
  noteStyle: NoteStyle;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  if (champ.type === "note") {
    return (
      <div>
        <label className="mb-2 block text-sm font-medium text-ink">
          {champ.label}
          {champ.required && <span className="text-accent"> *</span>}
        </label>
        <MiniNoteInput
          style={noteStyle}
          value={typeof value === "number" ? value : 0}
          onChange={onChange}
        />
      </div>
    );
  }

  if (champ.type === "select") {
    return (
      <Field label={champ.label} required={champ.required}>
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="input"
          required={champ.required}
        >
          <option value="">— Choisir —</option>
          {(champ.options || []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </Field>
    );
  }

  if (champ.type === "checkbox") {
    return (
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="h-5 w-5 rounded border-line bg-dark text-accent focus:ring-accent/20"
        />
        <span className="text-sm font-medium text-ink">
          {champ.label}
          {champ.required && <span className="text-accent"> *</span>}
        </span>
      </label>
    );
  }

  if (champ.type === "textarea") {
    return (
      <Field label={champ.label} required={champ.required}>
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          maxLength={2000}
          className="input resize-none"
          placeholder={champ.placeholder}
          required={champ.required}
        />
      </Field>
    );
  }

  return (
    <Field label={champ.label} required={champ.required}>
      <input
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        maxLength={500}
        className="input"
        placeholder={champ.placeholder}
        required={champ.required}
      />
    </Field>
  );
}

// ─── Shared Components ───────────────────────────────────────
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

function TypeIcon({ icon }: { icon: string }) {
  const map: Record<string, string> = {
    star: "★", hand: "🤝", chart: "📊", refresh: "🔄",
    compass: "🧭", book: "📚", heart: "❤️", trophy: "🏆",
    users: "👥", mic: "🎤", rocket: "🚀", flag: "🏁",
  };
  return <span>{map[icon] || icon.charAt(0).toUpperCase()}</span>;
}

function ShareCopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary-light"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      {copied ? "Copié !" : "Copier le lien"}
    </button>
  );
}
