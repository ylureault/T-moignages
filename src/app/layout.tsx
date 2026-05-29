import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "API Témoignages | Insuffle - Boussole 4C",
  description:
    "API de gestion des témoignages clients pour la plateforme Boussole 4C par Insuffle",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-slate-950 text-white antialiased">{children}</body>
    </html>
  );
}
