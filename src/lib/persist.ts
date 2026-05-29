import { promises as fs } from "fs";
import path from "path";

/**
 * Sauvegarde automatique des données (JSON).
 *
 * Deux couches, totalement non destructives :
 *  1. Snapshots locaux horodatés à chaque écriture (data/backups/), avec
 *     rotation des plus récents. Filet de sécurité immédiat (zéro config).
 *  2. Backup Git distant OPTIONNEL via l'API GitHub : survit aux redéploiements
 *     sur hébergement à système de fichiers éphémère. Restauration automatique
 *     au démarrage si les données locales sont absentes.
 *
 * Variables d'environnement pour le backup Git (optionnel) :
 *   BACKUP_GITHUB_TOKEN   token avec accès écriture au repo (contents:write)
 *   BACKUP_GITHUB_REPO    "owner/repo"
 *   BACKUP_GITHUB_BRANCH  défaut: "main"
 *   BACKUP_GITHUB_PATH    défaut: "backups/data.json"
 */

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const MAX_LOCAL_SNAPSHOTS = 30;

export type FullBackup = {
  temoignages: unknown[];
  types: unknown[];
  evenements: unknown[];
  invitations: unknown[];
  exportDate: string;
};

// ─── Snapshots locaux ─────────────────────────────────────────
async function writeLocalSnapshot(backup: FullBackup): Promise<void> {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const stamp = backup.exportDate.replace(/[:.]/g, "-");
    const payload = JSON.stringify(backup, null, 2);
    await fs.writeFile(path.join(BACKUP_DIR, "latest.json"), payload, "utf-8");
    await fs.writeFile(path.join(BACKUP_DIR, `backup-${stamp}.json`), payload, "utf-8");
    await rotateSnapshots();
  } catch {
    // Le backup ne doit jamais casser une écriture de données.
  }
}

async function rotateSnapshots(): Promise<void> {
  try {
    const files = (await fs.readdir(BACKUP_DIR))
      .filter((f) => f.startsWith("backup-") && f.endsWith(".json"))
      .sort();
    const excess = files.length - MAX_LOCAL_SNAPSHOTS;
    for (let i = 0; i < excess; i++) {
      await fs.unlink(path.join(BACKUP_DIR, files[i])).catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

export async function readLatestLocalSnapshot(): Promise<FullBackup | null> {
  try {
    const raw = await fs.readFile(path.join(BACKUP_DIR, "latest.json"), "utf-8");
    return JSON.parse(raw) as FullBackup;
  } catch {
    return null;
  }
}

// ─── Backup Git distant (optionnel) ───────────────────────────
function gitConfig() {
  const token = process.env.BACKUP_GITHUB_TOKEN;
  const repo = process.env.BACKUP_GITHUB_REPO;
  if (!token || !repo) return null;
  return {
    token,
    repo,
    branch: process.env.BACKUP_GITHUB_BRANCH || "main",
    filePath: process.env.BACKUP_GITHUB_PATH || "backups/data.json",
  };
}

export function isRemoteBackupEnabled(): boolean {
  return gitConfig() !== null;
}

function githubApi(url: string, init: RequestInit, token: string) {
  return fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
}

function contentsUrl(repo: string, filePath: string) {
  // On encode chaque segment mais on garde les "/".
  const encoded = filePath.split("/").map(encodeURIComponent).join("/");
  return `https://api.github.com/repos/${repo}/contents/${encoded}`;
}

async function pushToGit(backup: FullBackup): Promise<void> {
  const cfg = gitConfig();
  if (!cfg) return;
  try {
    const base = contentsUrl(cfg.repo, cfg.filePath);
    let sha: string | undefined;
    const getRes = await githubApi(`${base}?ref=${cfg.branch}`, { method: "GET" }, cfg.token);
    if (getRes.ok) {
      const cur = await getRes.json();
      sha = cur.sha;
    }
    const content = Buffer.from(JSON.stringify(backup, null, 2), "utf-8").toString("base64");
    await githubApi(base, {
      method: "PUT",
      body: JSON.stringify({
        message: `chore(backup): données du ${backup.exportDate}`,
        content,
        branch: cfg.branch,
        ...(sha ? { sha } : {}),
      }),
    }, cfg.token);
  } catch {
    // Best-effort : ne jamais propager une erreur de backup.
  }
}

export async function readRemoteBackup(): Promise<FullBackup | null> {
  const cfg = gitConfig();
  if (!cfg) return null;
  try {
    const base = contentsUrl(cfg.repo, cfg.filePath);
    const res = await githubApi(`${base}?ref=${cfg.branch}`, { method: "GET" }, cfg.token);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.content) return null;
    const decoded = Buffer.from(data.content, "base64").toString("utf-8");
    return JSON.parse(decoded) as FullBackup;
  } catch {
    return null;
  }
}

/**
 * Sauvegarde complète : snapshot local (rapide) + push Git distant (si activé).
 * Awaité pour rester fiable y compris en environnement serverless (où les
 * timers en arrière-plan ne s'exécutent pas après la réponse).
 */
export async function backupNow(backup: FullBackup): Promise<void> {
  await writeLocalSnapshot(backup);
  await pushToGit(backup);
}
