"use client";

import { useEffect, useState } from "react";
import { UsersManagement } from "@/components/users/users-management";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        const data = await response.json();
        const roles: string[] = data?.user?.roles ?? [];
        setIsAdmin(roles.includes("Admin") || roles.includes("Super Admin"));
      } catch {
        setIsAdmin(false);
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

  if (!isAdmin) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Permission denied</AlertTitle>
        <AlertDescription>
          You do not have access to manage users. Contact an administrator for
          access.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Users</h1>
      <UsersManagement />
    </div>
  );
}
