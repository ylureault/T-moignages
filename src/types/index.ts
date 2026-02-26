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
}

export interface TypeTemoignage {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
}
