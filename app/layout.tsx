import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Universal Eats Admin",
  description: "Back-office de gestion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      {/* CORRECTION ICI : 
         On ajoute les classes bg-gray-50 (clair) et bg-slate-950 (sombre) 
         directement dans le className. Plus d'erreur CSS !
      */}
      <body className={`${inter.className} bg-gray-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100`}>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
      </body>
    </html>
  );
}