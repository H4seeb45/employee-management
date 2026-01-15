"use client";

import { useEffect, useState } from "react";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { ExpenseCharts } from "@/components/dashboard/expense-charts";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Location = {
  id: string;
  name: string;
  city: string;
};

export default function DashboardPage() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("all");
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) return;
        const data = await response.json();
        const roles: string[] = data?.user?.roles ?? [];
        const superAdmin = roles.includes("Super Admin");
        setIsSuperAdmin(superAdmin);
        if (superAdmin) {
          setIsLoadingLocations(true);
          try {
            const locationsResponse = await fetch("/api/locations");
            const locationsData = await locationsResponse.json();
            if (locationsResponse.ok) {
              setLocations(locationsData.locations ?? locationsData ?? []);
            }
          } finally {
            setIsLoadingLocations(false);
          }
        }
      } catch {
        // ignore session failures
      }
    };
    loadSession();
  }, []);

  const activeLocationId =
    selectedLocationId === "all" ? null : selectedLocationId;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        {isSuperAdmin ? (
          <div className="flex items-center gap-3">
            <Label className="text-sm text-muted-foreground">Location</Label>
            <Select
              value={selectedLocationId}
              onValueChange={setSelectedLocationId}
              disabled={isLoadingLocations}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.city} - {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
      <DashboardStats />
      <ExpenseCharts locationId={activeLocationId} />
      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RecentEmployees />
        <UpcomingEvents />
      </div> */}
    </div>
  );
}
