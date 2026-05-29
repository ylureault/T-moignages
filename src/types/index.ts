export interface Reponse {
  auteur: string;
  contenu: string;
  date: string;
}

export interface Temoignage {
  id: string;
  auteur: string;
  entreprise: string;
  poste: string;
  avatar: string;
  note: number;
  contenu: string;
  reponse: Reponse | null;
  type: string;
  tags: string[];
  source: "google" | "trustpilot" | "linkedin" | "site" | "autre";
  verifie: boolean;
  date: string;
  recommande: boolean;
  /** Image de fond optionnelle du hero (URL d'upload), affichée en alpha. */
  heroImage?: string;
  /** Marque associée : "insuffle" (conseil) ou "academie" (formations). */
  marque: "insuffle" | "academie";
}

export interface TypeTemoignage {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
}

export interface Invitation {
  id: string;
  nom: string;
  email: string;
  entreprise: string;
  type: string;
  marque: "insuffle" | "academie";
  message: string;
  createdAt: string;
  used: boolean;
  usedAt?: string;
}
