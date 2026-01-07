"use client";

import React from "react";
import LayoutShell from "@/components/LayoutShell";
import PWAAdminPanel from "@/components/pwa-admin/PWAAdminPanel";

export default function MobileAppPage() {
  return (
    <LayoutShell>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="h-full w-full">
          <PWAAdminPanel />
        </div>
      </div>
    </LayoutShell>
  );
}