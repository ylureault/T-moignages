import { redirect } from "next/navigation";

// Outil interne : pas de vitrine publique. La racine mène au back-office.
// Les témoignages publiés s'exposent via l'API (/api/public/temoignages).
export default function Home() {
  redirect("/admin");
}
