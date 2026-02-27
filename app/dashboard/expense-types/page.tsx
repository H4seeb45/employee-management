"use client";

import { ExpenseTypeManagement } from "@/components/expenses/expense-type-management";
import { useLayout } from "@/components/layout/layout-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ExpenseTypesPage() {
  const { user, userLoading } = useLayout();
  const router = useRouter();

  useEffect(() => {
    if (!userLoading && !user) {
      router.replace("/login");
    } else if (!userLoading && user) {
      const isAdmin = user.roles.includes("Admin") || user.roles.includes("Super Admin");
      if (!isAdmin) {
        router.replace("/dashboard");
      }
    }
  }, [user, userLoading, router]);

  if (userLoading || !user) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isAdmin = user.roles.includes("Admin") || user.roles.includes("Super Admin");
  if (!isAdmin) return null;

  return <ExpenseTypeManagement />;
}
