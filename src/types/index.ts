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
  /** Intervenant ciblé par le témoignage (⊂ animateurs de l'événement). */
  animateur?: string;
  champsPersonnalises?: Record<string, unknown>;
  publie: boolean;
  /**
   * Archivé = retiré de partout (public + admin par défaut) mais JAMAIS
   * supprimé du fichier : restaurable à tout moment. Aucune suppression
   * physique de témoignage n'existe dans l'application.
   */
  archive?: boolean;
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
  entreprise?: string;
  bannerImage?: string;
  /**
   * Intervenant(s) de l'événement : facilitateur(s) (Insuffle) ou
   * formateur(s) (Académie). Zéro, un ou plusieurs, propres à chaque
   * événement. Le témoignage peut cibler l'un d'eux.
   */
  animateurs?: string[];
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
  /** Date du premier envoi de l'email d'invitation. */
  envoyeeAt?: string;
  /** Date de la dernière relance. */
  relanceAt?: string;
}

/**
 * Modèle d'email réutilisable pour la collecte de témoignages.
 * Variables disponibles dans sujet et corps : {prenom} {nom} {entreprise}
 * {evenement} {lien} {signature} — résolues au moment de l'envoi.
 */
export interface ModeleEmail {
  id: string;
  nom: string;
  categorie: "invitation" | "relance" | "remerciement" | "autre";
  sujet: string;
  corps: string;
}
