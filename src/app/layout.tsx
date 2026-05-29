import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Témoignages | Insuffle",
  description:
    "Ce que nos clients disent d'Insuffle — faisons bouger votre organisation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
