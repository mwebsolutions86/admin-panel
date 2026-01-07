"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  // Création d'une instance unique de QueryClient par session
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Configuration par défaut : pas de refetch automatique agressif
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}