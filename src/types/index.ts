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
  heroImage?: string;
  marque: "insuffle" | "academie";
  evenementId?: string;
  champsPersonnalises?: Record<string, unknown>;
  publie: boolean;
}

export interface ChampPersonnalise {
  id: string;
  label: string;
  type: "text" | "textarea" | "note" | "select" | "checkbox";
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export type NoteStyle = "stars" | "smileys" | "scale" | "thumbs";

export interface TypeTemoignage {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  noteStyle: NoteStyle;
  champs: ChampPersonnalise[];
}

export interface Evenement {
  id: string;
  nom: string;
  description: string;
  typeId: string;
  date: string;
  lieu?: string;
  marque: "insuffle" | "academie";
  createdAt: string;
  actif: boolean;
}

export interface Invitation {
  id: string;
  nom: string;
  email: string;
  entreprise: string;
  type: string;
  evenementId?: string;
  marque: "insuffle" | "academie";
  message: string;
  createdAt: string;
  used: boolean;
  usedAt?: string;
}
