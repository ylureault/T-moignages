import { redirect } from "next/navigation";

// Pas de liste publique des témoignages : c'est un outil interne.
// La gestion se fait dans le back-office ; l'affichage public passe par l'API.
export default function TemoignagesPage() {
  redirect("/admin");
}
