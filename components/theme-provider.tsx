"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// On utilise React.ComponentProps pour récupérer les types automatiquement
// sans avoir besoin d'importer un fichier qui n'existe plus.
export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}