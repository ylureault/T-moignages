import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { requireAuth } from "@/lib/auth";
import { isRemoteBackupEnabled } from "@/lib/persist";
import { getFullBackup } from "@/lib/db";

export const dynamic = "force-dynamic";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const BACKUP_DIR = path.join(DATA_DIR, "backups");

/**
 * Statut des sauvegardes : nombre de snapshots locaux, date du dernier,
 * backup GitHub activé ou non, et compteurs de données live. Permet de
 * vérifier d'un coup d'œil que le filet de sécurité est bien en place.
 */
export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  let snapshots: string[] = [];
  let dernierSnapshot: string | null = null;
  try {
    snapshots = (await fs.readdir(BACKUP_DIR))
      .filter((f) => f.startsWith("backup-") && f.endsWith(".json"))
      .sort();
    const latest = path.join(BACKUP_DIR, "latest.json");
    const stat = await fs.stat(latest).catch(() => null);
    if (stat) dernierSnapshot = stat.mtime.toISOString();
  } catch {
    // Pas encore de dossier backups : aucun snapshot.
  }

  const data = await getFullBackup();

  return NextResponse.json({
    success: true,
    data: {
      snapshotsLocaux: snapshots.length,
      dernierSnapshot,
      backupGitHubActif: isRemoteBackupEnabled(),
      compteurs: {
        temoignages: data.temoignages.length,
        types: data.types.length,
        evenements: data.evenements.length,
        invitations: data.invitations.length,
      },
    },
  });
}
