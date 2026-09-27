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
  /** Invitation (lien unique) par laquelle le témoignage a été donné. */
  invitationId?: string;
  /** Campagne d'origine, le cas échéant. */
  campagneId?: string;
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
  /** Nombre de relances envoyées. */
  relances?: number;
  /** Première ouverture du lien par le client. */
  ouverteAt?: string;
  /** Dernière erreur d'envoi (effacée au prochain envoi réussi). */
  envoiErreur?: string;
  /** Campagne à laquelle appartient l'invitation. */
  campagneId?: string;
}

/**
 * Campagne de collecte : un lot de destinataires (une invitation / un lien
 * unique chacun), envoyé en une fois, avec suivi envoyé → ouvert → répondu
 * et relance (manuelle groupée ou automatique) des non-répondants.
 */
export interface Campagne {
  id: string;
  nom: string;
  /** Événement lié : type, marque, client et intervenants en sont hérités. */
  evenementId?: string;
  type: string;
  marque: "insuffle" | "academie";
  entreprise?: string;
  /** Message personnel affiché en haut du formulaire client. */
  message?: string;
  modeleInvitationId?: string;
  modeleRelanceId?: string;
  /** Relance automatique des non-répondants. */
  relanceAuto: boolean;
  /** Délai (jours) après le dernier envoi avant relance automatique. */
  relanceDelaiJours: number;
  /** Nombre maximum de relances automatiques par destinataire. */
  relancesMax: number;
  /** URL publique de l'application (pour les liens des emails automatiques). */
  lienBase?: string;
  createdAt: string;
  /** Archivée = masquée de la liste, jamais supprimée. */
  archive?: boolean;
}

/**
 * Modèle d'email réutilisable pour la collecte de témoignages.
 * Variables disponibles dans sujet et corps : {prenom} {nom} {entreprise}
 * {evenement} {intervenant} {lien} {signature} — résolues au moment de l'envoi.
 */
export interface ModeleEmail {
  id: string;
  nom: string;
  categorie: "invitation" | "relance" | "remerciement" | "autre";
  sujet: string;
  corps: string;
}
