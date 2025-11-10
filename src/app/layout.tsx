import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Politik Cred' - Plateforme de crédibilité politique",
  description: "Évaluez la crédibilité de vos représentants politiques français basée sur des preuves factuelles et des votes communautaires modérés.",
  keywords: ["politique", "crédibilité", "France", "transparence", "démocratie"],
  authors: [{ name: "Politik Cred'" }],
  openGraph: {
    title: "Politik Cred'  - Plateforme de crédibilité politique",
    description: "Évaluez la crédibilité de vos représentants politiques français",
    type: "website",
    locale: "fr_FR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-PMWS2H379L"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-PMWS2H379L');
          `}
        </Script>

        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
