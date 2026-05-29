import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// SVG volontairement exclu : vecteur d'injection de script (XSS) une fois servi.
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Signatures binaires (magic bytes) pour valider le contenu réel du fichier,
// pas seulement le Content-Type déclaré (falsifiable).
const MAGIC_BYTES: Record<string, (b: Buffer) => boolean> = {
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png: (b) =>
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  gif: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46,
  webp: (b) =>
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50,
};

const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo

export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: "Requête multipart/form-data attendue" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: "Aucun fichier fourni (champ 'file')" },
      { status: 400 }
    );
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      {
        success: false,
        error: `Type non autorisé : ${file.type}. Acceptés : ${Object.keys(ALLOWED_TYPES).join(", ")}`,
      },
      { status: 415 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { success: false, error: `Fichier trop volumineux (max ${MAX_SIZE / 1024 / 1024} Mo)` },
      { status: 413 }
    );
  }

  // Nom de fichier sûr et unique
  const folder = formData.get("folder");
  const subdir =
    typeof folder === "string" && /^[a-z0-9_-]+$/i.test(folder) ? folder : "";
  const targetDir = path.join(UPLOAD_DIR, subdir);
  await fs.mkdir(targetDir, { recursive: true });

  const bytes = Buffer.from(await file.arrayBuffer());

  // Validation du contenu réel (anti-spoofing du Content-Type)
  const verifier = MAGIC_BYTES[ext];
  if (!verifier || !verifier(bytes)) {
    return NextResponse.json(
      {
        success: false,
        error: "Le contenu du fichier ne correspond pas à une image valide",
      },
      { status: 415 }
    );
  }

  // Nom généré côté serveur via crypto (jamais le nom client)
  const id = randomBytes(16).toString("hex");
  const filename = `${id}.${ext}`;
  const filePath = path.join(targetDir, filename);

  await fs.writeFile(filePath, bytes);

  const url = path.posix.join("/uploads", subdir, filename);

  return NextResponse.json(
    {
      success: true,
      data: {
        url,
        filename,
        size: file.size,
        type: file.type,
      },
    },
    { status: 201 }
  );
}

export async function DELETE(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const url = request.nextUrl.searchParams.get("url");
  if (!url || !url.startsWith("/uploads/")) {
    return NextResponse.json(
      { success: false, error: "Paramètre 'url' invalide (doit commencer par /uploads/)" },
      { status: 400 }
    );
  }

  // Empêche la traversée de répertoire
  const relative = url.replace(/^\/uploads\//, "");
  if (relative.includes("..")) {
    return NextResponse.json(
      { success: false, error: "Chemin invalide" },
      { status: 400 }
    );
  }

  const filePath = path.join(UPLOAD_DIR, relative);
  try {
    await fs.unlink(filePath);
  } catch {
    return NextResponse.json(
      { success: false, error: "Fichier non trouvé" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: { url } });
}
