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

type Location = {
  id: string;
  name: string;
  city: string;
};

export default function ExpensesPage() {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("all");
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
          setRoles([]);
          setLoading(false);
          return;
        }
        const data = await response.json();
        const sessionRoles: string[] = data?.user?.roles ?? [];
        setRoles(sessionRoles);
        const superAdmin = sessionRoles.includes("Super Admin");
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
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, []);

  if (loading) {
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
