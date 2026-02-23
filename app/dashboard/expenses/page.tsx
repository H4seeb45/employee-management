"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExpenseModule } from "@/components/expenses/expense-module";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLayout } from "@/components/layout/layout-provider";

type Location = {
  id: string;
  name: string;
  city: string;
};

export default function ExpensesPage() {
  const { user, userLoading } = useLayout();
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("all");
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  const roles = user?.roles ?? [];
  const isAdminOrAccountant = roles.includes("Super Admin") || roles.includes("Accountant") || roles.includes("Admin");
  const userAuthorizedLocations = user?.authorizedLocations ?? [];
  const primaryLocation = user?.location;
  
  // A user can filter if they are an admin/accountant or if they have multiple authorized locations
  const canFilterByLocation = isAdminOrAccountant || userAuthorizedLocations.length > 0;

  useEffect(() => {
    if (userLoading || !user) return;

    if (isAdminOrAccountant) {
      // Admins and Accountants see all locations
      setIsLoadingLocations(true);
      fetch("/api/locations")
        .then(res => res.json())
        .then(data => {
          if (data.locations || Array.isArray(data)) {
            setLocations(data.locations ?? data ?? []);
          }
        })
        .catch(err => console.error("Failed to load locations", err))
        .finally(() => setIsLoadingLocations(false));
    } else if (userAuthorizedLocations.length > 0) {
      // Restricted users with multiple locations only see their authorized ones
      const availableLocations: Location[] = [];
      if (primaryLocation) {
        availableLocations.push({
          id: primaryLocation.id,
          name: primaryLocation.name,
          city: primaryLocation.city
        });
      }
      
      userAuthorizedLocations.forEach((loc: any) => {
        // Prevent duplicates if primary is also in authorized
        if (!availableLocations.find(l => l.id === loc.id)) {
          availableLocations.push({
            id: loc.id,
            name: loc.name,
            city: loc.city
          });
        }
      });
      
      setLocations(availableLocations);
    }
  }, [isAdminOrAccountant, userLoading, user, userAuthorizedLocations, primaryLocation]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const allowedRoles = ["Cashier", "Admin", "Super Admin", "Business Manager", "Accountant"];
  const hasAccess = roles.some((role) => allowedRoles.includes(role));

  if (!hasAccess) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Permission denied</AlertTitle>
        <AlertDescription>
          You do not have access to manage expenses. Contact an administrator
          for access.
        </AlertDescription>
      </Alert>
    );
  }

  const activeLocationId =
    selectedLocationId === "all" ? null : selectedLocationId;

  return (
    <div className="space-y-6">
      {canFilterByLocation ? (
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
      <ExpenseModule roles={roles} locationId={activeLocationId} />
    </div>
  );
}
