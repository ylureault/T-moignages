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
  // ── Séminaires ──────────────────────────────────────────────
  {
    id: "seminaire-codir", label: "Séminaire CODIR",
    description: "Séminaire d'alignement pour comités de direction — clarifier les priorités, décider ensemble",
    icon: "compass", color: "#1f3a8b", noteStyle: "stars",
    champs: [
      { id: "objectif-atteint", label: "L'objectif du séminaire a-t-il été atteint ?", type: "select", required: true, options: ["Totalement", "En grande partie", "Partiellement", "Pas vraiment"] },
      { id: "alignement", label: "Alignement de l'équipe après le séminaire", type: "note" },
      { id: "facilitation", label: "Qualité de la facilitation (Yoan)", type: "note" },
      { id: "decisions", label: "Les décisions prises sont-elles claires et actionnables ?", type: "select", options: ["Oui, très claires", "Plutôt claires", "Encore floues", "Non"] },
      { id: "moment-fort", label: "Quel a été le moment le plus marquant ?", type: "textarea", placeholder: "Le moment où quelque chose a basculé…" },
      { id: "suite", label: "Que comptez-vous mettre en place dès lundi ?", type: "textarea", placeholder: "Les premières actions concrètes…" },
      { id: "recommandation", label: "Recommanderiez-vous ce séminaire à un autre dirigeant ?", type: "select", options: ["Oui, sans hésiter", "Oui, probablement", "Je ne sais pas", "Non"] },
    ],
  },
  {
    id: "seminaire-vision", label: "Séminaire Vision (Futur Désiré®)",
    description: "Séminaire de 2 jours pour construire une vision collective et mobiliser les équipes",
    icon: "star", color: "#8b5cf6", noteStyle: "stars",
    champs: [
      { id: "clarte-vision", label: "La vision construite est-elle claire pour vous ?", type: "note" },
      { id: "engagement", label: "Votre niveau d'engagement après le séminaire", type: "note" },
      { id: "facilitation", label: "Qualité de la facilitation", type: "note" },
      { id: "avant-apres", label: "Qu'est-ce qui a changé dans votre compréhension de la direction de l'entreprise ?", type: "textarea", required: true, placeholder: "Avant le séminaire, je pensais que… Maintenant…" },
      { id: "ambassadeur", label: "Vous sentez-vous ambassadeur de cette vision ?", type: "select", options: ["Oui, totalement", "Oui, en partie", "Pas encore", "Non"] },
      { id: "emotion", label: "En un mot, qu'avez-vous ressenti pendant ces 2 jours ?", type: "text", placeholder: "Ex : clarté, énergie, espoir…" },
    ],
  },
  {
    id: "seminaire-cohesion", label: "Séminaire Cohésion d'équipe",
    description: "Séminaire de régulation pour remettre le dialogue au centre et recréer la confiance",
    icon: "hand", color: "#14b8a6", noteStyle: "smileys",
    champs: [
      { id: "climat", label: "Comment jugez-vous le climat d'équipe après le séminaire ?", type: "note" },
      { id: "non-dits", label: "Les vrais sujets ont-ils pu être abordés ?", type: "select", options: ["Oui, en profondeur", "Oui, en surface", "Pas assez", "Non, pas du tout"] },
      { id: "confiance", label: "Niveau de confiance dans l'équipe après le séminaire", type: "note" },
      { id: "cadre-securisant", label: "Le cadre posé par le facilitateur était-il sécurisant ?", type: "select", options: ["Tout à fait", "Plutôt oui", "Pas suffisamment", "Non"] },
      { id: "engagement", label: "Qu'est-ce que vous vous engagez à changer ?", type: "textarea", placeholder: "Ce que je fais différemment dès demain…" },
      { id: "amelioration", label: "Un point à améliorer pour la prochaine fois ?", type: "textarea", placeholder: "Ce qui pourrait être mieux…" },
    ],
  },
  {
    id: "offsite-strategique", label: "Offsite Stratégique",
    description: "Séminaire résidentiel de 2-3 jours pour prendre des décisions structurantes",
    icon: "chart", color: "#f59e0b", noteStyle: "scale",
    champs: [
      { id: "qualite-decisions", label: "Qualité des décisions prises", type: "note" },
      { id: "methode", label: "Pertinence de la méthode de travail proposée", type: "note" },
      { id: "lieu-format", label: "Le format résidentiel a-t-il ajouté de la valeur ?", type: "select", options: ["Oui, indispensable", "Oui, un plus", "Neutre", "Non, pas nécessaire"] },
      { id: "impact-strategique", label: "Quel impact sur votre stratégie d'entreprise ?", type: "textarea", required: true, placeholder: "Ce qui a vraiment bougé pour l'entreprise…" },
      { id: "calendrier", label: "Le calendrier de mise en œuvre est-il réaliste ?", type: "select", options: ["Oui, très réaliste", "Oui, ambitieux mais faisable", "Trop ambitieux", "Pas défini"] },
    ],
  },
  // ── Ateliers ────────────────────────────────────────────────
  {
    id: "atelier-intelligence-collective", label: "Atelier Intelligence Collective",
    description: "Atelier collaboratif pour résoudre un défi complexe grâce à l'intelligence collective",
    icon: "lightbulb", color: "#10b981", noteStyle: "smileys",
    champs: [
      { id: "pertinence-sujet", label: "Le sujet traité était-il pertinent pour vous ?", type: "select", options: ["Tout à fait", "Plutôt oui", "Moyennement", "Non"] },
      { id: "participation", label: "Avez-vous pu vous exprimer librement ?", type: "note" },
      { id: "dynamique-groupe", label: "Dynamique du groupe", type: "note" },
      { id: "solutions", label: "Les solutions trouvées collectivement sont-elles concrètes ?", type: "select", options: ["Oui, très concrètes", "Oui, à affiner", "Trop vagues", "Non"] },
      { id: "apprentissage", label: "Qu'avez-vous appris sur la façon de travailler ensemble ?", type: "textarea", placeholder: "Ce qui m'a surpris dans notre intelligence collective…" },
      { id: "reutiliser", label: "Allez-vous réutiliser cette méthode dans votre équipe ?", type: "select", options: ["Oui, dès que possible", "Oui, à adapter", "Peut-être", "Non"] },
    ],
  },
  {
    id: "atelier-innovation", label: "Atelier Innovation & Créativité",
    description: "Hackathon ou atelier créatif pour générer des idées et prototyper des solutions",
    icon: "rocket", color: "#ec4899", noteStyle: "thumbs",
    champs: [
      { id: "creativite", label: "L'atelier a-t-il libéré votre créativité ?", type: "note" },
      { id: "cadre-creatif", label: "Le cadre proposé favorisait-il l'innovation ?", type: "select", options: ["Oui, très stimulant", "Oui, plutôt bien", "Pas assez", "Non, trop contraint"] },
      { id: "idee-retenue", label: "Quelle idée ou solution retenez-vous ?", type: "textarea", required: true, placeholder: "L'idée qui a émergé et que je retiens…" },
      { id: "faisabilite", label: "Cette idée est-elle réaliste à mettre en œuvre ?", type: "select", options: ["Oui, rapidement", "Oui, avec du travail", "Incertain", "Non"] },
      { id: "energie", label: "Niveau d'énergie pendant l'atelier", type: "note" },
    ],
  },
  {
    id: "atelier-regulation", label: "Atelier Régulation & Conflits",
    description: "Atelier de résolution de tensions et construction d'accords de fonctionnement",
    icon: "shield", color: "#ef4444", noteStyle: "smileys",
    champs: [
      { id: "securite", label: "Vous êtes-vous senti(e) en sécurité pour vous exprimer ?", type: "note" },
      { id: "ecoute", label: "Qualité d'écoute du groupe", type: "note" },
      { id: "resolution", label: "Les tensions abordées ont-elles été désamorcées ?", type: "select", options: ["Oui, significativement", "En partie", "Peu", "Non"] },
      { id: "accords", label: "Les accords pris sont-ils clairs et acceptés par tous ?", type: "select", options: ["Oui, par tous", "Oui, par la majorité", "Pas vraiment", "Non"] },
      { id: "ressenti", label: "Comment vous sentez-vous après cet atelier ?", type: "textarea", placeholder: "Mon ressenti en quittant la salle…" },
    ],
  },
  // ── Formations (Académie Insuffle) ──────────────────────────
  {
    id: "formation-facilitation", label: "Formation Facilitation & Intelligence Collective",
    description: "Formation certifiante de 3 jours (21h) — postures, outils et pratique de la facilitation",
    icon: "book", color: "#3b82f6", noteStyle: "stars",
    champs: [
      { id: "contenu", label: "Qualité et richesse du contenu", type: "note" },
      { id: "pedagogie", label: "Qualité pédagogique (80% pratique)", type: "note" },
      { id: "formateur", label: "Qualité du formateur", type: "note" },
      { id: "applicabilite", label: "Allez-vous appliquer ce que vous avez appris ?", type: "select", required: true, options: ["Oui, dès cette semaine", "Oui, dans le mois", "J'ai besoin de digérer", "Ce sera difficile"] },
      { id: "outil-prefere", label: "Quel outil ou méthode vous a le plus marqué ?", type: "textarea", placeholder: "L'outil que je vais réutiliser en premier…" },
      { id: "posture", label: "Qu'avez-vous compris sur la posture de facilitateur ?", type: "textarea", placeholder: "Ce qui a changé dans ma compréhension du rôle…" },
      { id: "format-ideal", label: "Le format 3 jours est-il adapté ?", type: "select", options: ["Parfait", "Un peu court", "Un peu long", "À revoir"] },
      { id: "recommandation", label: "Recommanderiez-vous cette formation ?", type: "select", options: ["Oui, absolument", "Oui, probablement", "Peut-être", "Non"] },
    ],
  },
  {
    id: "formation-manager-facilitateur", label: "Formation Manager Facilitateur",
    description: "Formation de 3 jours (21h) pour intégrer la facilitation dans le management au quotidien",
    icon: "users", color: "#6366f1", noteStyle: "stars",
    champs: [
      { id: "contenu", label: "Pertinence du contenu pour votre quotidien de manager", type: "note" },
      { id: "pedagogie", label: "Qualité pédagogique", type: "note" },
      { id: "formateur", label: "Qualité du formateur", type: "note" },
      { id: "changement-posture", label: "Qu'est-ce qui change dans votre façon de manager ?", type: "textarea", required: true, placeholder: "Avant la formation, je… Maintenant, je…" },
      { id: "premier-pas", label: "Quelle est la première chose que vous allez tester avec votre équipe ?", type: "textarea", placeholder: "Dès lundi, je vais…" },
      { id: "difficulte", label: "Qu'est-ce qui sera le plus difficile à appliquer ?", type: "textarea", placeholder: "Ce qui me challenge…" },
      { id: "recommandation", label: "Recommanderiez-vous cette formation à un autre manager ?", type: "select", options: ["Oui, absolument", "Oui, probablement", "Peut-être", "Non"] },
    ],
  },
  {
    id: "formation-ia-generative", label: "Formation IA Générative",
    description: "Formation d'une journée (7h) sur l'utilisation de l'IA générative (Claude, Gemini, etc.)",
    icon: "zap", color: "#0ea5e9", noteStyle: "smileys",
    champs: [
      { id: "niveau-avant", label: "Votre niveau avant la formation", type: "select", options: ["Débutant total", "Quelques notions", "Utilisateur régulier", "Avancé"] },
      { id: "niveau-apres", label: "Votre niveau après la formation", type: "select", options: ["Débutant", "Capable d'utiliser les bases", "Autonome", "Confiant et créatif"] },
      { id: "contenu", label: "Qualité du contenu", type: "note" },
      { id: "rythme", label: "Le rythme était-il adapté ?", type: "select", options: ["Parfait", "Un peu rapide", "Un peu lent", "Mal adapté"] },
      { id: "cas-usage", label: "Quel cas d'usage allez-vous mettre en place ?", type: "textarea", required: true, placeholder: "Comment je vais utiliser l'IA dans mon travail…" },
      { id: "crainte", label: "Avez-vous encore des craintes vis-à-vis de l'IA ?", type: "textarea", placeholder: "Ce qui me questionne encore…" },
    ],
  },
  {
    id: "formation-sketchnoting", label: "Formation Sketchnoting",
    description: "Formation de 2 jours (14h) pour maîtriser la prise de notes visuelles",
    icon: "pen", color: "#f97316", noteStyle: "smileys",
    champs: [
      { id: "contenu", label: "Qualité du contenu", type: "note" },
      { id: "pedagogie", label: "Approche pédagogique", type: "note" },
      { id: "progression", label: "Sentez-vous une progression dans vos dessins ?", type: "select", options: ["Oui, énorme", "Oui, significative", "Un peu", "Pas vraiment"] },
      { id: "usage", label: "Où allez-vous utiliser le sketchnoting ?", type: "textarea", placeholder: "En réunion, pour mes comptes-rendus, pour…" },
      { id: "confiance", label: "Avez-vous pris confiance dans votre capacité à dessiner ?", type: "select", options: ["Oui, totalement", "Oui, un peu plus", "Pas encore", "Non"] },
    ],
  },
  // ── Accompagnement & Coaching ───────────────────────────────
  {
    id: "coaching-codir", label: "Coaching CODIR",
    description: "Accompagnement long (6-12 mois) d'un comité de direction dans sa transformation",
    icon: "refresh", color: "#0d9488", noteStyle: "scale",
    champs: [
      { id: "evolution-equipe", label: "Comment l'équipe de direction a-t-elle évolué ?", type: "textarea", required: true, placeholder: "Ce qui a changé dans notre façon de fonctionner…" },
      { id: "qualite-relation", label: "Qualité de la relation avec Yoan/Insuffle", type: "note" },
      { id: "pertinence-interventions", label: "Pertinence des interventions et outils proposés", type: "note" },
      { id: "impact-business", label: "Impact sur la performance de l'entreprise", type: "note" },
      { id: "autonomie", label: "Êtes-vous plus autonomes en tant qu'équipe de direction ?", type: "select", options: ["Oui, nettement", "Oui, progressivement", "Pas encore", "Non"] },
      { id: "duree", label: "La durée de l'accompagnement était-elle adaptée ?", type: "select", options: ["Parfaite", "Un peu courte", "Un peu longue", "Mal calibrée"] },
      { id: "suite", label: "Envisagez-vous de poursuivre l'accompagnement ?", type: "select", options: ["Oui, déjà prévu", "Oui, probablement", "En réflexion", "Non, mission accomplie"] },
    ],
  },
  // ── Diagnostic ──────────────────────────────────────────────
  {
    id: "diagnostic-boussole-4c", label: "Diagnostic Boussole 4C",
    description: "Retour sur l'utilisation du diagnostic Boussole 4C (Cap, Cadence, Contraintes, Capacités)",
    icon: "compass", color: "#f59e0b", noteStyle: "stars",
    champs: [
      { id: "clarte-diagnostic", label: "Le diagnostic vous a-t-il apporté de la clarté ?", type: "note" },
      { id: "dimension-utile", label: "Quelle dimension vous a le plus éclairé ?", type: "select", required: true, options: ["Cap (direction)", "Cadence (rythme)", "Contraintes (freins)", "Capacités (forces)", "Les 4 ensemble"] },
      { id: "pertinence", label: "Pertinence des constats et recommandations", type: "note" },
      { id: "surprise", label: "Qu'est-ce qui vous a le plus surpris dans les résultats ?", type: "textarea", placeholder: "Ce que je ne voyais pas avant…" },
      { id: "actions", label: "Quelles actions avez-vous lancées suite au diagnostic ?", type: "textarea", placeholder: "Les changements concrets…" },
      { id: "refaire", label: "Referiez-vous un diagnostic dans 6-12 mois ?", type: "select", options: ["Oui, pour mesurer l'évolution", "Peut-être", "Non, une fois suffit"] },
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

  // Les événements sont des données utilisateur : jamais de seed automatique.
  // On crée seulement un fichier vide s'il est absent, pour ne JAMAIS recréer
  // de démos qui écraseraient/masqueraient les événements créés par l'admin.
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
