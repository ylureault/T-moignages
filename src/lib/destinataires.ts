/**
 * Analyse une liste de destinataires collée par l'admin (fonction pure,
 * partagée entre l'aperçu client et l'API). Formats acceptés, une ligne
 * par personne :
 *   marie@acme.fr
 *   Marie Dupont <marie@acme.fr>
 *   Marie Dupont; marie@acme.fr; Acme        (CSV ; ou ,)
 *   Marie Dupont<TAB>marie@acme.fr<TAB>Acme  (copier-coller Excel)
 *   Marie Dupont                             (sans email : lien à envoyer soi-même)
 * Les doublons d'email sont ignorés, une ligne d'en-tête est sautée.
 */

export interface Destinataire {
  nom: string;
  email: string;
  entreprise: string;
}

export interface ResultatAnalyse {
  valides: Destinataire[];
  /** Lignes non exploitables (email invalide…), pour affichage. */
  ignorees: string[];
  /** Nombre de doublons retirés. */
  doublons: number;
}

const EMAIL_RE = /[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const EMAIL_STRICT = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MAX_DESTINATAIRES = 1000;

function nettoyer(s: string): string {
  return s.replace(/^["'\s<]+|["'\s>]+$/g, "").trim();
}

export function analyserDestinataires(raw: string, dejaPresents: string[] = []): ResultatAnalyse {
  const vus = new Set(dejaPresents.map((e) => e.toLowerCase()).filter(Boolean));
  const valides: Destinataire[] = [];
  const ignorees: string[] = [];
  let doublons = 0;

  const lignes = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lignes.length; i++) {
    const ligne = lignes[i];
    // En-tête de tableau (« nom;email;entreprise ») : ignoré sans bruit.
    if (i === 0 && !ligne.includes("@") && /e-?mail/i.test(ligne)) continue;

    const match = ligne.match(EMAIL_RE);
    const email = match ? match[0].toLowerCase() : "";
    if (ligne.includes("@") && (!email || !EMAIL_STRICT.test(email))) {
      ignorees.push(ligne);
      continue;
    }

    // Retire l'email (et « <…> ») puis découpe les colonnes restantes.
    const reste = match ? ligne.replace(/<?\s*[^\s<>;,\t]*@[^\s<>;,\t]*\s*>?/, "\u0000") : ligne;
    const colonnes = reste.split(/[;\t,\u0000]/).map(nettoyer).filter(Boolean);
    const nom = (colonnes[0] || "").slice(0, 200);
    const entreprise = (colonnes[1] || "").slice(0, 200);

    if (!email && !nom) { ignorees.push(ligne); continue; }
    if (email) {
      if (vus.has(email)) { doublons++; continue; }
      vus.add(email);
    }
    valides.push({ nom, email, entreprise });
    if (valides.length >= MAX_DESTINATAIRES) break;
  }

  return { valides, ignorees, doublons };
}
