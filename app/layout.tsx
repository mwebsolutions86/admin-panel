import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"
import { Sidebar } from "@/components/sidebar"; // Import de notre Sidebar

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Control Tower - Universal Eats",
  description: "Système de gestion global",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body 
        className={`${inter.className} bg-gray-50 text-slate-900`}
        suppressHydrationWarning={true} 
      >
        <ThemeProvider
            attribute="class"
            defaultTheme="light" // On force le light pour l'instant pour la lisibilité
            enableSystem={false}
            disableTransitionOnChange
          >
          
          {/* LAYOUT PRINCIPAL : SIDEBAR + CONTENU */}
          <div className="flex min-h-screen">
            
            {/* 1. LA TOUR DE CONTRÔLE (Fixe à gauche) */}
            <Sidebar />

            {/* 2. LE CONTENU VARIABLE (Décalé de la largeur de la sidebar) */}
            <main className="flex-1 ml-64 min-h-screen bg-gray-50/50">
                {children}
            </main>

          </div>

        </ThemeProvider>
      </body>
    </html>
  );
}