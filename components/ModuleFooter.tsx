"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export function ModuleFooter() {
  return (
    <footer className="bg-white border-t mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Analytics & Finance</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/finance" className="hover:text-blue-600">Métriques Business</Link></li>
              <li><Link href="/loyalty" className="hover:text-blue-600">Fidélité & Clients</Link></li>
              <li><Link href="/analytics/operations" className="hover:text-blue-600">Opérations</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Rapports</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/analytics/reports" className="hover:text-blue-600">Tous les rapports</Link></li>
              <li><Link href="/analytics/reports/daily" className="hover:text-blue-600">Quotidien</Link></li>
              <li><Link href="/analytics/reports/monthly" className="hover:text-blue-600">Mensuel</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Configuration</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/promotions" className="hover:text-blue-600">Promotions</Link></li>
              <li><Link href="/notifications" className="hover:text-blue-600">Notifications</Link></li>
              <li><Link href="/mobile-app" className="hover:text-blue-600">App Mobile</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Ressources</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/settings/localization" className="hover:text-blue-600">Traductions</Link></li>
              <li><Link href="/docs" className="hover:text-blue-600">Documentation</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-200 flex justify-between items-center">
           <p className="text-sm text-gray-500">© 2025 Universal Eats</p>
           <Badge variant="outline">v2.0 Admin</Badge>
        </div>
      </div>
    </footer>
  );
}