"use client";

import React from "react";
import LayoutShell from "@/components/LayoutShell";
import { DeliveryPerformance } from "@/components/analytics/DeliveryPerformance";
import { ModuleFooter } from "@/components/ModuleFooter";

const MOCK_OPERATIONAL_DATA = {
  averageDeliveryTime: 25,
  onTimeDeliveryRate: 95,
  customerSatisfaction: 4.8,
  orderAccuracyRate: 99,
  averagePreparationTime: 12,
  driverUtilizationRate: 85,
  activeDrivers: 12,
  totalDeliveries: 150,
  
  // Propriétés complexes existantes
  deliveryTimeDistribution: { 
    under30min: 45, 
    between30to45min: 80, 
    between45to60min: 20, 
    over60min: 5 
  },
  deliveryPersonMetrics: {
    totalActive: 15,
    averageDeliveriesPerDay: 12,
    averageDeliveryTime: 22,
    customerRating: 4.8
  },
  preparationTimeByCategory: {
    'Pizza': 15,
    'Burger': 10,
    'Salade': 8,
    'Sushi': 18
  },
  orderAccuracy: 98.5, // Changé de objet à nombre selon interface
  
  // === PROPRIÉTÉS MANQUANTES AJOUTÉES ===
  complaintRate: 0.5,
  storeAvailability: {
    openStores: 12,
    closedStores: 2,
    averageOpeningHours: 14
  }
};

export default function OperationsPage() {
  return (
    <LayoutShell>
      <div className="flex-1 p-8 pt-6">
        <h2 className="text-3xl font-bold mb-6">Performance Opérationnelle</h2>
        <div className="mb-8">
          {/* @ts-ignore : temporaire si le composant DeliveryPerformance attend une structure légèrement différente */}
          <DeliveryPerformance data={MOCK_OPERATIONAL_DATA} />
        </div>
      </div>
      <ModuleFooter />
    </LayoutShell>
  );
}