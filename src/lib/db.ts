import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import type { Temoignage, TypeTemoignage, Invitation, Evenement } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const TEMOIGNAGES_FILE = path.join(DATA_DIR, "temoignages.json");
const TYPES_FILE = path.join(DATA_DIR, "types.json");
const INVITATIONS_FILE = path.join(DATA_DIR, "invitations.json");
const EVENEMENTS_FILE = path.join(DATA_DIR, "evenements.json");

const DEFAULT_TYPES: TypeTemoignage[] = [
  {
    id: "satisfaction-client", label: "Satisfaction client",
    description: "Avis liés à la qualité du service et la satisfaction globale",
    icon: "star", color: "#14b8a6", noteStyle: "stars",
    champs: [
      { id: "point-fort", label: "Quel aspect vous a le plus satisfait ?", type: "textarea", placeholder: "Ce qui m'a le plus marqué…" },
      { id: "amelioration", label: "Un point d'amélioration ?", type: "textarea", placeholder: "Ce qui pourrait être amélioré…" },
      { id: "recommandation", label: "Recommanderiez-vous Insuffle ?", type: "select", options: ["Oui, sans hésiter", "Oui, probablement", "Je ne sais pas", "Non"] },
    ],
  },
  {
    id: "accompagnement", label: "Accompagnement",
    description: "Retours sur la qualité de l'accompagnement et du suivi",
    icon: "hand", color: "#3b82f6", noteStyle: "stars",
    champs: [
      { id: "disponibilite", label: "Disponibilité de l'équipe", type: "note" },
      { id: "ecoute", label: "Qualité d'écoute", type: "note" },
      { id: "suivi", label: "Qualité du suivi", type: "note" },
      { id: "attentes", label: "L'accompagnement a-t-il répondu à vos attentes ?", type: "textarea", placeholder: "Décrivez votre expérience…" },
    ],
  },
  {
    id: "resultats", label: "Résultats obtenus",
    description: "Témoignages axés sur les résultats concrets et mesurables",
    icon: "chart", color: "#10b981", noteStyle: "smileys",
    champs: [
      { id: "impact", label: "Quel a été l'impact principal ?", type: "textarea", required: true, placeholder: "L'impact concret sur votre organisation…" },
      { id: "mesurable", label: "Avez-vous observé des résultats mesurables ?", type: "select", options: ["Oui, très clairement", "Oui, partiellement", "Pas encore", "Non"] },
      { id: "delai", label: "En combien de temps avez-vous vu les premiers résultats ?", type: "select", options: ["Immédiatement", "Quelques semaines", "1-3 mois", "Plus de 3 mois"] },
    ],
  },
  {
    id: "transformation", label: "Transformation organisationnelle",
    description: "Retours sur les changements structurels et culturels observés",
    icon: "refresh", color: "#8b5cf6", noteStyle: "scale",
    champs: [
      { id: "avant-apres", label: "Décrivez la situation avant et après", type: "textarea", required: true, placeholder: "Avant l'intervention… Après l'intervention…" },
      { id: "changement-culture", label: "Changement culturel observé", type: "note" },
      { id: "adhesion-equipe", label: "Adhésion des équipes", type: "note" },
      { id: "perennite", label: "Les changements sont-ils durables ?", type: "select", options: ["Oui, pleinement ancrés", "En cours d'ancrage", "Trop tôt pour dire", "Non"] },
    ],
  },
  {
    id: "diagnostic", label: "Diagnostic Boussole 4C",
    description: "Avis spécifiques à l'outil de diagnostic Boussole 4C",
    icon: "compass", color: "#f59e0b", noteStyle: "stars",
    champs: [
      { id: "clarte", label: "Clarté du diagnostic", type: "note" },
      { id: "pertinence", label: "Pertinence des recommandations", type: "note" },
      { id: "utilite", label: "L'outil Boussole 4C vous a-t-il été utile ?", type: "textarea", placeholder: "Comment l'avez-vous utilisé…" },
      { id: "actions", label: "Quelles actions avez-vous mises en place suite au diagnostic ?", type: "textarea", placeholder: "Les changements concrets…" },
    ],
  },
  {
    id: "formation", label: "Formation & Coaching",
    description: "Témoignages liés aux formations et séances de coaching",
    icon: "book", color: "#ec4899", noteStyle: "smileys",
    champs: [
      { id: "contenu-formation", label: "Qualité du contenu", type: "note" },
      { id: "pedagogie", label: "Qualité pédagogique", type: "note" },
      { id: "applicabilite", label: "Applicabilité au quotidien", type: "note" },
      { id: "apprentissage", label: "Qu'avez-vous appris de plus marquant ?", type: "textarea", placeholder: "Les apprentissages clés…" },
      { id: "format-prefere", label: "Format préféré", type: "select", options: ["Présentiel", "Distanciel", "Hybride", "Coaching individuel"] },
    ],
  },
];

let initialized = false;

async function ensureDataDir(): Promise<void> {
  if (initialized) return;
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(TEMOIGNAGES_FILE);
  } catch {
    await fs.writeFile(TEMOIGNAGES_FILE, "[]", "utf-8");
  }

  try {
    await fs.access(TYPES_FILE);
  } catch {
    await fs.writeFile(TYPES_FILE, JSON.stringify(DEFAULT_TYPES, null, 2), "utf-8");
  }

  try {
    await fs.access(INVITATIONS_FILE);
  } catch {
    await fs.writeFile(INVITATIONS_FILE, "[]", "utf-8");
  }

  try {
    await fs.access(EVENEMENTS_FILE);
  } catch {
    await fs.writeFile(EVENEMENTS_FILE, "[]", "utf-8");
  }

  initialized = true;
}

const locks = new Map<string, Promise<unknown>>();

async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  const current = previous.then(fn, fn);
  locks.set(
    key,
    current.catch(() => {})
  );
  return current;
}

async function readJSON<T>(filePath: string): Promise<T> {
  await ensureDataDir();
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

async function writeJSON<T>(filePath: string, data: T): Promise<void> {
  await ensureDataDir();
  const tmp = `${filePath}.${randomBytes(6).toString("hex")}.tmp`;
  const payload = JSON.stringify(data, null, 2);
  try {
    await fs.writeFile(tmp, payload, "utf-8");
    await fs.rename(tmp, filePath);
  } catch (err) {
    await fs.unlink(tmp).catch(() => {});
    throw err;
  }
}

export async function getTemoignages(): Promise<Temoignage[]> {
  return readJSON<Temoignage[]>(TEMOIGNAGES_FILE);
}

export async function saveTemoignages(data: Temoignage[]): Promise<void> {
  await withLock(TEMOIGNAGES_FILE, () => writeJSON(TEMOIGNAGES_FILE, data));
}

export async function getTypes(): Promise<TypeTemoignage[]> {
  return readJSON<TypeTemoignage[]>(TYPES_FILE);
}

export async function saveTypes(data: TypeTemoignage[]): Promise<void> {
  await withLock(TYPES_FILE, () => writeJSON(TYPES_FILE, data));
}

export async function getInvitations(): Promise<Invitation[]> {
  return readJSON<Invitation[]>(INVITATIONS_FILE);
}

export async function saveInvitations(data: Invitation[]): Promise<void> {
  await withLock(INVITATIONS_FILE, () => writeJSON(INVITATIONS_FILE, data));
}

export async function getEvenements(): Promise<Evenement[]> {
  return readJSON<Evenement[]>(EVENEMENTS_FILE);
}

export async function saveEvenements(data: Evenement[]): Promise<void> {
  await withLock(EVENEMENTS_FILE, () => writeJSON(EVENEMENTS_FILE, data));
}

export async function getFullBackup(): Promise<{
  temoignages: Temoignage[];
  types: TypeTemoignage[];
  evenements: Evenement[];
  invitations: Invitation[];
  exportDate: string;
}> {
  const [temoignages, types, evenements, invitations] = await Promise.all([
    getTemoignages(),
    getTypes(),
    getEvenements(),
    getInvitations(),
  ]);
  return { temoignages, types, evenements, invitations, exportDate: new Date().toISOString() };
}

export async function restoreBackup(backup: {
  temoignages: Temoignage[];
  types: TypeTemoignage[];
  evenements?: Evenement[];
  invitations?: Invitation[];
}): Promise<void> {
  const ops = [
    saveTemoignages(backup.temoignages),
    saveTypes(backup.types),
  ];
  if (backup.evenements) ops.push(saveEvenements(backup.evenements));
  if (backup.invitations) ops.push(saveInvitations(backup.invitations));
  await Promise.all(ops);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
