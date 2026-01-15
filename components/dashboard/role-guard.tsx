"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);

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
        setRoles(data?.user?.roles ?? []);
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

  const isAdmin = roles.includes("Admin") || roles.includes("Super Admin");
  const isBusinessManager = roles.includes("Business Manager");
  const isCashierOnly =
    roles.includes("Cashier") && !isAdmin && !isBusinessManager;

  if (isCashierOnly && !pathname.startsWith("/dashboard/expenses")) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Permission denied</AlertTitle>
        <AlertDescription>
          You do not have access to this module. Please use the Expenses section
          or contact an administrator.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}
