"use client";

import { RoutesVehiclesModule } from "@/components/routes-vehicles/routes-vehicles-module";

export default function RoutesVehiclesPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Routes & Vehicles</h1>
        <p className="text-muted-foreground">
          Manage routes and vehicles for expense tracking
        </p>
      </div>
      <RoutesVehiclesModule />
    </div>
  );
}
