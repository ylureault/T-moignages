import { promises as fs } from "fs";
import path from "path";
import type { Temoignage, TypeTemoignage } from "@/types";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const TEMOIGNAGES_FILE = path.join(DATA_DIR, "temoignages.json");
const TYPES_FILE = path.join(DATA_DIR, "types.json");

async function readJSON<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

async function writeJSON<T>(filePath: string, data: T): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function getTemoignages(): Promise<Temoignage[]> {
  return readJSON<Temoignage[]>(TEMOIGNAGES_FILE);
}

export async function saveTemoignages(data: Temoignage[]): Promise<void> {
  await writeJSON(TEMOIGNAGES_FILE, data);
}

export async function getTypes(): Promise<TypeTemoignage[]> {
  return readJSON<TypeTemoignage[]>(TYPES_FILE);
}

export async function saveTypes(data: TypeTemoignage[]): Promise<void> {
  await writeJSON(TYPES_FILE, data);
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
