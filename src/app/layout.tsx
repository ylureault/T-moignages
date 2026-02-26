export const metadata = {
  title: "API Témoignages - Boussole 4C",
  description: "API de consultation des témoignages et avis clients",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
