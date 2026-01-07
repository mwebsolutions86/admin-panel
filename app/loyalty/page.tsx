"use client";

import React from "react";
import LayoutShell from "@/components/LayoutShell";
import { AdminLoyaltyDashboard } from "@/components/loyalty/AdminLoyaltyDashboard";

export default function LoyaltyPage() {
  return (
    <LayoutShell>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="h-full w-full">
          {/* Le dashboard gère son propre en-tête et sa navigation par onglets */}
          <AdminLoyaltyDashboard />
        </div>
      </div>
    </LayoutShell>
  );
}