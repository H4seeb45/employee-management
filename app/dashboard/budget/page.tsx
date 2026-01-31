"use client";

import { useLayout } from "@/components/layout/layout-provider";
import { BudgetManagement } from "@/components/budget/budget-management";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function BudgetPage() {
  const { user, userLoading } = useLayout();

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      </div>
    );
  }

  const roles = user?.roles ?? [];
  const hasAccess = roles.includes("Admin") || roles.includes("Super Admin") || roles.includes("Business Manager");

  if (!hasAccess) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You do not have permission to access budget management. This module is restricted to Admins and Business Managers.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <BudgetManagement roles={roles} />
    </div>
  );
}
