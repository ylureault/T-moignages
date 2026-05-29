import type { Temoignage, TypeTemoignage } from "@/types";

const VALID_SOURCES = ["google", "trustpilot", "linkedin", "site", "autre"];
const VALID_MARQUES = ["insuffle", "academie"];

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function isString(v: unknown): v is string {
  return typeof v === "string";
}

/** Valide et normalise un témoignage entrant (création / restauration). */
export function validateTemoignage(raw: unknown): Result<Temoignage> {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Témoignage invalide (objet attendu)" };
  }
  const o = raw as Record<string, unknown>;

  if (!isString(o.id) || o.id.length === 0 || o.id.length > 64) {
    return { ok: false, error: "id invalide" };
  }
  if (!isString(o.auteur) || o.auteur.length === 0 || o.auteur.length > 200) {
    return { ok: false, error: "auteur invalide" };
  }
  if (!isString(o.contenu) || o.contenu.length === 0 || o.contenu.length > 5000) {
    return { ok: false, error: "contenu invalide" };
  }
  if (!isString(o.type) || o.type.length > 64) {
    return { ok: false, error: "type invalide" };
  }
  if (typeof o.note !== "number" || o.note < 1 || o.note > 5) {
    return { ok: false, error: "note invalide (1-5)" };
  }
  if (o.source !== undefined && (!isString(o.source) || !VALID_SOURCES.includes(o.source))) {
    return { ok: false, error: `source invalide (${VALID_SOURCES.join(", ")})` };
  }
  if (o.marque !== undefined && (!isString(o.marque) || !VALID_MARQUES.includes(o.marque))) {
    return { ok: false, error: `marque invalide (${VALID_MARQUES.join(", ")})` };
  }
  if (o.tags !== undefined && (!Array.isArray(o.tags) || !o.tags.every(isString))) {
    return { ok: false, error: "tags invalides (tableau de chaînes)" };
  }

  const value: Temoignage = {
    id: o.id,
    auteur: o.auteur,
    entreprise: isString(o.entreprise) ? o.entreprise : "",
    poste: isString(o.poste) ? o.poste : "",
    avatar: isString(o.avatar) ? o.avatar : "",
    note: o.note,
    contenu: o.contenu,
    reponse:
      o.reponse && typeof o.reponse === "object"
        ? (o.reponse as Temoignage["reponse"])
        : null,
    type: o.type,
    tags: Array.isArray(o.tags) ? (o.tags as string[]) : [],
    source: (isString(o.source) ? o.source : "site") as Temoignage["source"],
    marque: (isString(o.marque) && VALID_MARQUES.includes(o.marque)
      ? o.marque
      : "insuffle") as Temoignage["marque"],
    verifie: typeof o.verifie === "boolean" ? o.verifie : false,
    date: isString(o.date) ? o.date : new Date().toISOString().split("T")[0],
    recommande: typeof o.recommande === "boolean" ? o.recommande : true,
    ...(isString(o.heroImage) && o.heroImage.length <= 512
      ? { heroImage: o.heroImage }
      : {}),
    ...(isString(o.evenementId) ? { evenementId: o.evenementId } : {}),
    ...(o.champsPersonnalises && typeof o.champsPersonnalises === "object"
      ? { champsPersonnalises: o.champsPersonnalises as Record<string, unknown> }
      : {}),
    publie: typeof o.publie === "boolean" ? o.publie : true,
  };
  return { ok: true, value };
}

/** Valide un type de témoignage. */
export function validateType(raw: unknown): Result<TypeTemoignage> {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Type invalide (objet attendu)" };
  }
  const o = raw as Record<string, unknown>;
  if (!isString(o.id) || !/^[a-z0-9_-]+$/i.test(o.id) || o.id.length > 64) {
    return { ok: false, error: "id de type invalide" };
  }
  if (!isString(o.label) || o.label.length === 0 || o.label.length > 120) {
    return { ok: false, error: "label invalide" };
  }
  const validStyles = ["stars", "smileys", "scale", "thumbs"];
  const value: TypeTemoignage = {
    id: o.id,
    label: o.label,
    description: isString(o.description) ? o.description : "",
    icon: isString(o.icon) ? o.icon : "star",
    color: isString(o.color) && /^#[0-9a-f]{6}$/i.test(o.color) ? o.color : "#14b8a6",
    noteStyle: isString(o.noteStyle) && validStyles.includes(o.noteStyle)
      ? o.noteStyle as TypeTemoignage["noteStyle"]
      : "stars",
    champs: Array.isArray(o.champs) ? o.champs : [],
  };
  return { ok: true, value };
}

/** Valide une charge de restauration complète avant d'écraser les données. */
export function validateBackup(raw: unknown): Result<{
  temoignages: Temoignage[];
  types: TypeTemoignage[];
}> {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Backup invalide" };
  }
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.temoignages)) {
    return { ok: false, error: "'temoignages' (array) requis" };
  }
  if (!Array.isArray(o.types)) {
    return { ok: false, error: "'types' (array) requis" };
  }
  // Garde-fous de volume.
  if (o.temoignages.length > 100000 || o.types.length > 1000) {
    return { ok: false, error: "Volume de données trop important" };
  }

  const temoignages: Temoignage[] = [];
  for (let i = 0; i < o.temoignages.length; i++) {
    const r = validateTemoignage(o.temoignages[i]);
    if (!r.ok) return { ok: false, error: `temoignages[${i}]: ${r.error}` };
    temoignages.push(r.value);
  }

  const types: TypeTemoignage[] = [];
  for (let i = 0; i < o.types.length; i++) {
    const r = validateType(o.types[i]);
    if (!r.ok) return { ok: false, error: `types[${i}]: ${r.error}` };
    types.push(r.value);
  }

  return { ok: true, value: { temoignages, types } };
}
