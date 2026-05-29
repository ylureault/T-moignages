import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import type { Temoignage, TypeTemoignage, Invitation } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const TEMOIGNAGES_FILE = path.join(DATA_DIR, "temoignages.json");
const TYPES_FILE = path.join(DATA_DIR, "types.json");
const INVITATIONS_FILE = path.join(DATA_DIR, "invitations.json");

const DEFAULT_TYPES: TypeTemoignage[] = [
  { id: "satisfaction-client", label: "Satisfaction client", description: "Avis liés à la qualité du service et la satisfaction globale", icon: "star", color: "#14b8a6" },
  { id: "accompagnement", label: "Accompagnement", description: "Retours sur la qualité de l'accompagnement et du suivi", icon: "hand", color: "#3b82f6" },
  { id: "resultats", label: "Résultats obtenus", description: "Témoignages axés sur les résultats concrets et mesurables", icon: "chart", color: "#10b981" },
  { id: "transformation", label: "Transformation organisationnelle", description: "Retours sur les changements structurels et culturels observés", icon: "refresh", color: "#8b5cf6" },
  { id: "diagnostic", label: "Diagnostic Boussole 4C", description: "Avis spécifiques à l'outil de diagnostic Boussole 4C", icon: "compass", color: "#f59e0b" },
  { id: "formation", label: "Formation & Coaching", description: "Témoignages liés aux formations et séances de coaching", icon: "book", color: "#ec4899" },
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

export async function getFullBackup(): Promise<{
  temoignages: Temoignage[];
  types: TypeTemoignage[];
  exportDate: string;
}> {
  const [temoignages, types] = await Promise.all([
    getTemoignages(),
    getTypes(),
  ]);
  return {
    temoignages,
    types,
    exportDate: new Date().toISOString(),
  };
}

export async function restoreBackup(backup: {
  temoignages: Temoignage[];
  types: TypeTemoignage[];
}): Promise<void> {
  await Promise.all([
    saveTemoignages(backup.temoignages),
    saveTypes(backup.types),
  ]);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
