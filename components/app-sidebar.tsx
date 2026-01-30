"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Truck,
  Shield,
  ChevronRight,
  LogOut,
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
  {
    name: "Expenses",
    href: "/dashboard/expenses",
    icon: Briefcase,
    requiredRoles: ["Cashier","Accountant"],
  },
  {
    name: "Routes & Vehicles",
    href: "/dashboard/routes-vehicles",
    icon: Truck,
    adminOnly: true,
  },
  { name: "Users", href: "/dashboard/users", icon: Users, adminOnly: true },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen, user, userLoading: isSessionLoading, clearUser } = useLayout();
  const [isMobile, setIsMobile] = useState(false);

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

  const roles = user?.roles ?? [];
  const email = user?.email ?? null;
  const isAdmin = roles.includes("Admin") || roles.includes("Super Admin");
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
          "fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-[#0A192F] via-[#0D1F3C] to-[#0A192F] text-white shadow-2xl transform transition-transform duration-300 ease-in-out md:translate-x-0 border-r border-slate-700/50",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Premium Header with Shield Logo */}
          <div className="relative h-20 px-6 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/30 to-transparent backdrop-blur-sm">
            <div className="flex items-center justify-between h-full">
              <div className="flex items-center gap-3 group cursor-pointer">
                {/* Shield Logo with Gradient */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg border border-blue-400/20">
                    <Shield className="h-6 w-6 text-white" strokeWidth={2.5} />
                  </div>
                </div>
                
                {/* Company Name */}
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white leading-none">
                    Sadiq Traders
                  </h1>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                    Enterprise HRMS
                  </p>
                </div>
              </div>

              {/* Mobile Close Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-slate-400 hover:text-white hover:bg-white/10 rounded-lg"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {isSessionLoading && (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  <p className="text-xs text-slate-400">Loading menu...</p>
                </div>
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
                        "group relative flex items-center justify-between px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-200",
                        isActive
                          ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-900/50" 
                          : "text-slate-300 hover:bg-slate-800/40 hover:text-white"
                      )}
                      onClick={() => isMobile && setSidebarOpen(false)}
                    >
                      {/* Active Indicator */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
                      )}
                      
                      <div className="flex items-center flex-1">
                        <div className={cn(
                          "mr-3 p-1.5 rounded-lg transition-all",
                          isActive 
                            ? "bg-white/20" 
                            : "bg-slate-700/30 group-hover:bg-slate-700/50"
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="tracking-wide">{item.name}</span>
                      </div>

                      {/* Chevron Indicator */}
                      <ChevronRight 
                        className={cn(
                          "h-4 w-4 transition-all",
                          isActive 
                            ? "opacity-100 translate-x-0" 
                            : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                        )}
                      />
                    </Link>
                  );
                })}
          </nav>

          {/* Enhanced User Profile Section */}
          <div className="relative border-t border-slate-700/50 bg-gradient-to-r from-slate-800/20 to-transparent backdrop-blur-sm">
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/10 to-transparent pointer-events-none"></div>
            
            <div className="relative p-4 space-y-3">
              {/* User Info */}
              <div className="flex items-center gap-3">
                {/* Avatar with Glow */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl blur-sm opacity-40"></div>
                  <div className="relative h-11 w-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold text-lg shadow-lg border border-blue-400/30">
                    {avatarLetter}
                  </div>
                </div>

                {/* User Details */}
                <div className="flex-1 min-w-0">
                  {isSessionLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                      <span className="text-xs text-slate-400">Loading...</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white truncate">
                          {roleLabel}
                        </p>
                        {(isAdmin || isSuperAdmin) && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {email || "user@company.com"}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={async () => {
                  try {
                    await fetch("/api/auth/logout", { method: "POST" });
                  } catch {
                    // ignore logout failures
                  }
                  // Clear user session from context
                  clearUser();
                  router.replace("/login");
                }}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-slate-300 bg-slate-800/40 hover:bg-red-600/20 hover:text-red-400 rounded-lg transition-all duration-200 border border-slate-700/50 hover:border-red-500/30"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
