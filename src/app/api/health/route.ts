import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { isRemoteBackupEnabled } from "@/lib/persist";

export const dynamic = "force-dynamic";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

/**
 * Healthcheck de déploiement et de supervision (public, sans secret).
 * Renvoie 200 si l'application est saine, 503 sinon — utilisable par
 * un monitoring (UptimeRobot, cron…) ou par la checklist de déploiement.
 */
export async function GET() {
  // Le dossier de données doit être accessible en écriture (persistance).
  let dataWritable = false;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const probe = path.join(DATA_DIR, ".health-probe");
    await fs.writeFile(probe, "ok", "utf-8");
    await fs.unlink(probe);
    dataWritable = true;
  } catch {
    dataWritable = false;
  }

  const adminConfigure = Boolean(
    process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 4
  );

  const ok = dataWritable && adminConfigure;

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      checks: {
        donneesEcriture: dataWritable,
        motDePasseAdminConfigure: adminConfigure,
        backupGitHubActif: isRemoteBackupEnabled(),
        emailConfigure: Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL),
      },
      version: process.env.npm_package_version || "1.0.0",
      horodatage: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 }
  );
}
