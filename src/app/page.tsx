export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>API Témoignages</h1>
      <p style={{ color: "#666", marginBottom: "2rem" }}>API en lecture seule pour les témoignages Boussole 4C.</p>

      <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Endpoints disponibles</h2>
      <ul style={{ lineHeight: 2 }}>
        <li><code>GET /api/temoignages</code> — Liste paginée de tous les témoignages</li>
        <li><code>GET /api/temoignages/:id</code> — Détail d'un témoignage</li>
        <li><code>GET /api/types</code> — Liste des types de témoignages</li>
      </ul>

      <h2 style={{ fontSize: "1.25rem", marginTop: "1.5rem", marginBottom: "0.5rem" }}>Filtres (query params)</h2>
      <ul style={{ lineHeight: 2 }}>
        <li><code>type</code> — Filtrer par type (ex: diagnostic, formation)</li>
        <li><code>source</code> — Filtrer par source (google, trustpilot, linkedin)</li>
        <li><code>note_min</code> — Note minimum (1-5)</li>
        <li><code>tag</code> — Filtrer par tag</li>
        <li><code>verifie</code> — Uniquement les vérifiés (true)</li>
        <li><code>q</code> — Recherche texte (contenu, auteur, entreprise)</li>
        <li><code>sort</code> — Tri par date ou note (défaut: date)</li>
        <li><code>order</code> — asc ou desc (défaut: desc)</li>
        <li><code>page</code> — Numéro de page (défaut: 1)</li>
        <li><code>limit</code> — Résultats par page (défaut: 10, max: 50)</li>
      </ul>
    </main>
  );
}
