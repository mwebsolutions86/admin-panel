import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import AuthGuard from "@/components/AuthGuard";
import LayoutShell from "@/components/LayoutShell";
import { LocalizationProvider } from "@/hooks/use-localization";
import QueryProvider from "@/components/QueryProvider";
// ✅ AJOUT : Import du Footer (avec les accolades car c'est un export nommé)
import { ModuleFooter } from "@/components/ModuleFooter";

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
            <QueryProvider>
              <LocalizationProvider>
                <AuthGuard>
                  <LayoutShell>
                      {/* ✅ AJOUT : Structure Flex pour coller le footer en bas */}
                      <div className="flex flex-col min-h-[calc(100vh-64px)]">
                        
                        {/* Zone de contenu principale qui prend tout l'espace disponible */}
                        <div className="flex-1">
                          {children}
                        </div>

                        {/* Footer persistant sur TOUTES les pages */}
                        <div className="mt-auto z-50 relative">
                          <ModuleFooter />
                        </div>

                      </div>
                  </LayoutShell>
                </AuthGuard>
              </LocalizationProvider>
            </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}