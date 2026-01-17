"use client";

import React from "react";
import Link from "next/link";

export function ModuleFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-8 border-t bg-background/50 backdrop-blur-sm py-6">
      <div className="container flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground md:flex-row">
        
        <div className="flex items-center gap-2">
          <span className="font-semibold">Universal Eats Admin</span>
          <span>•</span>
          <span>v2.1.0 (Production)</span>
        </div>

        <div className="flex gap-6">
            <Link href="/legal/terms" className="hover:text-primary transition-colors">CGU</Link>
            <Link href="/legal/privacy" className="hover:text-primary transition-colors">Confidentialité</Link>
            <Link href="/docs" className="hover:text-primary transition-colors">Aide</Link>
            <a href="mailto:support@universaleats.com" className="hover:text-primary transition-colors">Support</a>
        </div>

        <div>
          © {currentYear} Universal Eats Solutions.
        </div>

      </div>
    </footer>
  );
}