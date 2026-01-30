"use client";

import { UsersManagement } from "@/components/users/users-management";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useLayout } from "@/components/layout/layout-provider";

export default function UsersPage() {
  const { user, userLoading } = useLayout();
  const roles = user?.roles ?? [];
  const isAdmin = roles.includes("Admin") || roles.includes("Super Admin");

  if (userLoading) {
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
