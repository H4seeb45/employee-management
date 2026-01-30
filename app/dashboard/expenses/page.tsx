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
  const isSuperAdmin = roles.includes("Super Admin");

  useEffect(() => {
    if (isSuperAdmin && !userLoading) {
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
    }
  }, [isSuperAdmin, userLoading]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const allowedRoles = ["Cashier", "Admin", "Super Admin", "Business Manager"];
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
      <ExpenseModule roles={roles} locationId={activeLocationId} />
    </div>
  );
}
