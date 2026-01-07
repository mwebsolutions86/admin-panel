"use client";

import React from "react";
import LayoutShell from "@/components/LayoutShell";
import { TranslationAdmin } from "@/components/localization/TranslationAdmin";

export default function LocalizationPage() {
  return (
    <LayoutShell>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="h-full w-full">
          <TranslationAdmin />
        </div>
      </div>
    </LayoutShell>
  );
}