import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import AuthGuard from "@/components/AuthGuard";
import LayoutShell from "@/components/LayoutShell";
import { LocalizationProvider } from "@/hooks/use-localization";
// 👇 Import du nouveau QueryProvider
import QueryProvider from "@/components/QueryProvider";

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
            defaultTheme="light" 
            enableSystem={false}
            disableTransitionOnChange
          >
            {/* 👇 AJOUT : On enveloppe avec QueryProvider */}
            <QueryProvider>
              <LocalizationProvider>
                
                {/* 1. SÉCURITÉ : On enveloppe tout dans le Gardien */}
                <AuthGuard>
                  
                  {/* 2. STRUCTURE : On utilise notre coquille intelligente */}
                  <LayoutShell>
                      {children}
                  </LayoutShell>

                </AuthGuard>

              </LocalizationProvider>
            </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}