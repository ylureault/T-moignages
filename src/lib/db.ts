import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import type { Temoignage, TypeTemoignage } from "@/types";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const TEMOIGNAGES_FILE = path.join(DATA_DIR, "temoignages.json");
const TYPES_FILE = path.join(DATA_DIR, "types.json");

// Verrou en mémoire pour sérialiser les écritures (évite les écritures concurrentes
// qui se chevauchent et corrompent le JSON).
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
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

/**
 * Écriture atomique : on écrit dans un fichier temporaire puis on le renomme.
 * Le rename est atomique sur le même système de fichiers, donc le fichier final
 * n'est jamais partiellement écrit (pas de corruption en cas de crash).
 */
async function writeJSON<T>(filePath: string, data: T): Promise<void> {
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
