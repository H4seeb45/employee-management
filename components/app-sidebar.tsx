"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Users,
  Calendar,
  ClipboardList,
  Briefcase,
  Settings,
  X,
  Banknote,
  Loader2,
} from "lucide-react";
import { useLayout } from "@/components/layout/layout-provider";

const sidebarItems = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Employees", href: "/dashboard/employees", icon: Users },
  { name: "Attendance", href: "/dashboard/attendance", icon: Calendar },
  {
    name: "Leave Management",
    href: "/dashboard/leave-management",
    icon: ClipboardList,
  },
  { name: "Payroll", href: "/dashboard/payroll", icon: Briefcase },
  { name: "Loans", href: "/dashboard/loans", icon: Banknote },
  // { name: "Projects", href: "/dashboard/projects", icon: Briefcase },
  {
    name: "Expenses",
    href: "/dashboard/expenses",
    icon: Briefcase,
    requiredRoles: ["Cashier"],
  },
  { name: "Users", href: "/dashboard/users", icon: Users, adminOnly: true },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useLayout();
  const [isMobile, setIsMobile] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  // Check if we're on mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => {
      window.removeEventListener("resize", checkIfMobile);
    };
  }, [setSidebarOpen]);

  useEffect(() => {
    const loadSession = async () => {
      setIsSessionLoading(true);
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) return;
        const data = await response.json();
        const roles: string[] = data?.user?.roles ?? [];
        setIsAdmin(roles.includes("Admin") || roles.includes("Super Admin"));
        setRoles(roles);
        setEmail(data?.user?.email ?? null);
      } catch {
        // ignore session failures
      } finally {
        setIsSessionLoading(false);
      }
    };
    loadSession();
  }, []);

  const isBusinessManager = roles.includes("Business Manager");
  const isSuperAdmin = roles.includes("Super Admin");
  const isCashierOnly =
    roles.includes("Cashier") && !isAdmin && !isBusinessManager && !isSuperAdmin;
  const roleLabel = roles.length > 0 ? roles.join(", ") : "No role";
  const avatarLetter = email?.[0]?.toUpperCase() || "U";

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-200 ease-in-out md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-sky-600 dark:text-sky-400">
              Sadiq Traders
            </h1>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {isSessionLoading && (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
            {!isSessionLoading &&
              sidebarItems
                .filter((item) => {
                  if (isCashierOnly) return item.href === "/dashboard/expenses";
                  if (item.adminOnly && !isAdmin) return false;
                  if (!item.requiredRoles || item.requiredRoles.length === 0)
                    return true;
                  if (isAdmin || isBusinessManager) return true;
                  return item.requiredRoles.some((role) =>
                    roles.includes(role)
                  );
                })
                .map((item) => {
                  // Make dashboard only active on exact `/dashboard` path.
                  // Other items should be active for their path or any nested routes.
                  let isActive = false;
                  if (item.href === "/dashboard") {
                    isActive = pathname === "/dashboard";
                  } else {
                    isActive =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                  }
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center px-4 py-3 text-sm rounded-md transition-colors",
                        isActive
                          ? "bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400"
                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/50"
                      )}
                      onClick={() => isMobile && setSidebarOpen(false)}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
          </nav>
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-sky-500 flex items-center justify-center text-white font-medium">
                {avatarLetter}
              </div>
              <div className="ml-3">
                {isSessionLoading ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading…</span>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {roleLabel}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {email || "user@company.com"}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
