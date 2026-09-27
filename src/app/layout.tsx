import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

/** Google Analytics 4 (gtag.js). */
const GA_ID = "G-W57H67TD3N";

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
      <body className="bg-dark text-ink antialiased">
        {children}
        {/* Google tag (gtag.js) */}
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
        </Script>
      </body>
    </html>
  );
}
