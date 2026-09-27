import type { NextRequest } from "next/server";
import type { Campagne, Evenement, Invitation, ModeleEmail } from "@/types";
import { getCampagnes, getEvenements, getInvitations, getModeles, patchInvitations } from "./db";
import { isEmailConfigured, sendEmail, texteVersHtml } from "./brevo";
import { resoudreVariables } from "./modeles";

/**
 * Campagnes de collecte : statistiques, envoi groupé (invitation ou
 * relance) et relance automatique planifiée des non-répondants.
 * Tout l'envoi se fait côté serveur (pas de limite de débit navigateur).
 */

export type ModeEnvoi = "invitation" | "relance";

export interface StatsCampagne {
  destinataires: number;
  avecEmail: number;
  envoyes: number;
  ouverts: number;
  repondus: number;
  relances: number;
  erreurs: number;
  /** Destinataires avec email jamais contactés. */
  aEnvoyer: number;
  /** Contactés, sans réponse : relançables. */
  aRelancer: number;
  /** % de répondants sur l'ensemble des destinataires. */
  tauxReponse: number;
}

export function statsCampagne(invs: Invitation[]): StatsCampagne {
  const s: StatsCampagne = {
    destinataires: invs.length, avecEmail: 0, envoyes: 0, ouverts: 0, repondus: 0,
    relances: 0, erreurs: 0, aEnvoyer: 0, aRelancer: 0, tauxReponse: 0,
  };
  for (const i of invs) {
    if (i.email) s.avecEmail++;
    if (i.envoyeeAt) s.envoyes++;
    if (i.ouverteAt || i.used) s.ouverts++;
    if (i.used) s.repondus++;
    s.relances += i.relances || (i.relanceAt ? 1 : 0);
    if (i.envoiErreur) s.erreurs++;
    if (i.email && !i.used && !i.envoyeeAt) s.aEnvoyer++;
    if (i.email && !i.used && i.envoyeeAt) s.aRelancer++;
  }
  s.tauxReponse = s.destinataires > 0 ? Math.round((s.repondus / s.destinataires) * 100) : 0;
  return s;
}

/**
 * URL publique de l'application, pour les liens des emails.
 * PUBLIC_URL si défini, sinon déduite de la requête (derrière un proxy :
 * X-Forwarded-Proto / X-Forwarded-Host).
 */
export function baseUrlDepuisRequete(request: NextRequest): string {
  const env = (process.env.PUBLIC_URL || "").trim();
  if (env) return env.replace(/\/+$/, "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "");
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

/** Destinataires concernés par un envoi (jamais ceux qui ont répondu). */
export function ciblesEnvoi(invs: Invitation[], mode: ModeEnvoi, ids?: string[]): Invitation[] {
  const filtre = ids && ids.length > 0 ? new Set(ids) : null;
  return invs.filter((i) => {
    if (!i.email || i.used) return false;
    if (filtre && !filtre.has(i.id)) return false;
    return mode === "invitation" ? !i.envoyeeAt : Boolean(i.envoyeeAt);
  });
}

/** Modèle à utiliser : celui de la campagne, sinon le premier de la catégorie. */
export function modelePourCampagne(c: Campagne, mode: ModeEnvoi, modeles: ModeleEmail[]): ModeleEmail | undefined {
  const id = mode === "invitation" ? c.modeleInvitationId : c.modeleRelanceId;
  return modeles.find((m) => m.id === id)
    || modeles.find((m) => m.categorie === mode && (c.evenementId ? true : !m.corps.includes("{evenement}")))
    || modeles.find((m) => m.categorie === mode);
}

export interface ResultatEnvoi {
  cibles: number;
  envoyes: number;
  echecs: { id: string; email: string; erreur: string }[];
}

/**
 * Envoie (ou relance) les destinataires d'une campagne via Brevo.
 * Concurrence limitée, statuts enregistrés au fil de l'eau (un envoi
 * interrompu ne renverra jamais deux fois le même email).
 */
export async function envoyerCampagne(
  campagne: Campagne,
  mode: ModeEnvoi,
  opts: { baseUrl: string; sujet?: string; corps?: string; ids?: string[]; auto?: boolean }
): Promise<ResultatEnvoi> {
  const [invitations, evenements, modeles] = await Promise.all([getInvitations(), getEvenements(), getModeles()]);
  const evt: Evenement | undefined = campagne.evenementId
    ? evenements.find((e) => e.id === campagne.evenementId)
    : undefined;

  let cibles = ciblesEnvoi(invitations.filter((i) => i.campagneId === campagne.id), mode, opts.ids);
  if (opts.auto) {
    const delaiMs = campagne.relanceDelaiJours * 24 * 3600 * 1000;
    const maintenant = Date.now();
    cibles = cibles.filter((i) => {
      const dernier = new Date(i.relanceAt || i.envoyeeAt || i.createdAt).getTime();
      return (i.relances || 0) < campagne.relancesMax && maintenant - dernier >= delaiMs;
    });
  }

  const modele = modelePourCampagne(campagne, mode, modeles);
  const sujetModele = opts.sujet?.trim() || modele?.sujet || "";
  const corpsModele = opts.corps?.trim() || modele?.corps || "";
  if (!sujetModele || !corpsModele) {
    throw new Error("Aucun modèle d'email disponible pour cet envoi");
  }

  const resultat: ResultatEnvoi = { cibles: cibles.length, envoyes: 0, echecs: [] };
  const patches = new Map<string, Partial<Invitation>>();
  let enAttente = 0;

  async function flush(force = false) {
    if (patches.size === 0 || (!force && enAttente < 20)) return;
    const lot = new Map(patches);
    patches.clear();
    enAttente = 0;
    await patchInvitations(lot);
  }

  const file = [...cibles];
  async function travailleur() {
    while (file.length > 0) {
      const inv = file.shift()!;
      const sujet = resoudreVariables(sujetModele, inv, evt, opts.baseUrl);
      const corps = resoudreVariables(corpsModele, inv, evt, opts.baseUrl);
      const r = await sendEmail({ to: inv.email, subject: sujet, html: texteVersHtml(corps) });
      const now = new Date().toISOString();
      if (r.success) {
        resultat.envoyes++;
        patches.set(inv.id, mode === "invitation"
          ? { envoyeeAt: now, envoiErreur: undefined }
          : { relanceAt: now, relances: (inv.relances || 0) + 1, envoiErreur: undefined });
      } else {
        const erreur = r.error || "Erreur inconnue";
        resultat.echecs.push({ id: inv.id, email: inv.email, erreur });
        patches.set(inv.id, { envoiErreur: erreur.slice(0, 500) });
      }
      enAttente++;
      await flush();
    }
  }

  try {
    await Promise.all(Array.from({ length: Math.min(4, cibles.length) }, () => travailleur()));
  } finally {
    await flush(true);
  }
  return resultat;
}

/** Marque des destinataires comme contactés sans envoyer (envoi externe). */
export async function marquerEnvoyes(campagne: Campagne, mode: ModeEnvoi, ids?: string[]): Promise<number> {
  const invitations = await getInvitations();
  const cibles = ciblesEnvoi(invitations.filter((i) => i.campagneId === campagne.id), mode, ids);
  const now = new Date().toISOString();
  const patches = new Map<string, Partial<Invitation>>();
  for (const i of cibles) {
    patches.set(i.id, mode === "invitation"
      ? { envoyeeAt: now, envoiErreur: undefined }
      : { relanceAt: now, relances: (i.relances || 0) + 1 });
  }
  await patchInvitations(patches);
  return cibles.length;
}

// ─── Relance automatique ──────────────────────────────────────

/** Jours ouvrés 9h–18h (heure de Paris) : on ne relance pas un client la nuit. */
export function heureOuvree(date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", weekday: "short", hour: "numeric", hour12: false,
  }).formatToParts(date);
  const jour = parts.find((p) => p.type === "weekday")?.value || "";
  const heure = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const weekend = /^(sam|dim)/i.test(jour);
  return !weekend && heure >= 9 && heure < 18;
}

let passeEnCours = false;

/**
 * Une passe de relance automatique sur toutes les campagnes actives.
 * `forcer` ignore la plage horaire (bouton « Lancer maintenant »).
 */
export async function passeRelancesAuto(forcer = false): Promise<{ campagne: string; envoyes: number; echecs: number }[]> {
  if (passeEnCours || !isEmailConfigured()) return [];
  if (!forcer && !heureOuvree()) return [];
  passeEnCours = true;
  const bilan: { campagne: string; envoyes: number; echecs: number }[] = [];
  try {
    const campagnes = await getCampagnes();
    for (const c of campagnes) {
      if (c.archive || !c.relanceAuto) continue;
      const baseUrl = (process.env.PUBLIC_URL || c.lienBase || "").replace(/\/+$/, "");
      if (!baseUrl) continue;
      try {
        const r = await envoyerCampagne(c, "relance", { baseUrl, auto: true });
        if (r.cibles > 0) {
          bilan.push({ campagne: c.nom, envoyes: r.envoyes, echecs: r.echecs.length });
          console.log(`[campagnes] relance auto « ${c.nom} » : ${r.envoyes} envoyée(s), ${r.echecs.length} échec(s)`);
        }
      } catch (e) {
        console.error(`[campagnes] relance auto « ${c.nom} » impossible :`, e);
      }
    }
  } finally {
    passeEnCours = false;
  }
  return bilan;
}

const G = globalThis as { __planificateurCampagnes?: boolean };

/** Démarre la relance automatique (une passe par heure). Idempotent. */
export function demarrerPlanificateur(): void {
  if (G.__planificateurCampagnes || process.env.CAMPAGNES_RELANCE_AUTO === "off") return;
  G.__planificateurCampagnes = true;
  const tick = () => { passeRelancesAuto().catch((e) => console.error("[campagnes] passe échouée :", e)); };
  setTimeout(tick, 2 * 60_000).unref?.();
  setInterval(tick, 60 * 60_000).unref?.();
}
