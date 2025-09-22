import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';

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
        <AuthProvider>
          {children}
        </AuthProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
