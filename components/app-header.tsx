"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bell,
  Search,
  Moon,
  User,
  LogOut,
  Settings,
  HelpCircle,
  Menu,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLayout } from "@/components/layout/layout-provider";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function AppHeader() {
  const [searchQuery, setSearchQuery] = useState("");
  const { theme, setTheme } = useTheme();
  const { sidebarOpen, setSidebarOpen, setDarkMode } = useLayout();
  const { toast } = useToast();
  const pathname = usePathname();

  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      title: string;
      message: string | null;
      link: string | null;
      createdAt: string;
      isRead: boolean;
    }>
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();

  // Ensure theme is loaded before rendering toggle
  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate breadcrumbs from path
  const breadcrumbs = pathname === "/" ? [] : pathname.split("/").filter(Boolean);

  const handleThemeToggle = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    setDarkMode(newTheme === "dark");
    toast({
      title: `${
        newTheme.charAt(0).toUpperCase() + newTheme.slice(1)
      } mode activated`,
      description: `You've switched to ${newTheme} mode.`,
    });
  };

  const { user, userLoading } = useLayout();
  
  useEffect(() => {
    if (!userLoading) {
      if (!user) {
        router.replace("/login");
      } else {
        setEmail(user.email);
        setReady(true);
      }
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const loadNotifications = async () => {
      try {
        const response = await fetch("/api/notifications?limit=10");
        const data = await response.json();
        if (!response.ok) return;
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      } catch {
        // ignore polling failures
      }
    };

    loadNotifications();
    // recall every 10 minutes
    intervalId = setInterval(loadNotifications, 600000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const handleNotificationClick = async (
    notificationId: string,
    link?: string | null
  ) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, isRead: true } : item
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore failures
    }
    if (link) {
      router.push(link);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore logout failures
    }
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-[#0A192F]/80 backdrop-blur-md px-6 md:px-8 shadow-sm transition-all duration-200">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        {/* Breadcrumbs */}
        <div className="hidden md:flex overflow-x-auto">
             <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.filter(x => x !== 'dashboard').map((segment, index, arr) => {
                    const filteredArr = arr.filter(x => x !== 'dashboard');
                    const href = `/${filteredArr.slice(0, index + 1).join("/")}`;
                    const isLast = index === filteredArr.length - 1;
                    const formattedDetails = segment.split("-").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
                    
                    return (
                        <div key={segment} className="flex items-center gap-1.5 sm:gap-2.5">
                            {index > 0 && <BreadcrumbSeparator />}
                            <BreadcrumbItem>
                                {isLast ? (
                                    <BreadcrumbPage className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">{formattedDetails}</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink href={href} className="whitespace-nowrap">{formattedDetails}</BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                        </div>
                    );
                })}
              </BreadcrumbList>
            </Breadcrumb>
        </div>
      </div>

      <div className="w-full flex items-center justify-end">
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
            <Label htmlFor="theme-mode" className="text-xs text-slate-600 dark:text-slate-400">
              Dark Mode
            </Label>
            {mounted && (
              <Switch
                id="theme-mode"
                checked={theme === "dark"}
                onCheckedChange={handleThemeToggle}
              />
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full relative border-slate-200 dark:border-slate-700 dark:bg-slate-800/50"
              >
                <Bell className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                {unreadCount > 0 ? (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-red-500 px-1 text-[10px] font-medium text-white flex items-center justify-center">
                    {unreadCount}
                  </span>
                ) : null}
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[300px]">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-muted-foreground">
                    No notifications.
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="cursor-pointer"
                      onClick={() =>
                        handleNotificationClick(
                          notification.id,
                          notification.link
                        )
                      }
                    >
                      <div className="flex flex-col gap-1">
                        <p
                          className={`font-medium ${
                            notification.isRead ? "text-muted-foreground" : ""
                          }`}
                        >
                          {notification.title}
                        </p>
                        {notification.message ? (
                          <p className="text-xs text-muted-foreground">
                            {notification.message}
                          </p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer justify-center text-center">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full border-slate-200 dark:border-slate-700 dark:bg-slate-800/50">
                <User className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <span className="sr-only">User menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2">
               <div className="flex items-center gap-2 p-2 mb-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                    {email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex flex-col">
                     <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">My Account</span>
                     <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">{email}</span>
                  </div>
               </div>
              <DropdownMenuItem
                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
