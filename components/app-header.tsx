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
import { useRouter } from "next/navigation";

export function AppHeader() {
  const [searchQuery, setSearchQuery] = useState("");
  const { theme, setTheme } = useTheme();
  const { sidebarOpen, setSidebarOpen, setDarkMode } = useLayout();
  const { toast } = useToast();

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

  const router = useRouter();

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

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
          router.replace("/login");
          return;
        }
        const data = await response.json();
        setEmail(data?.user?.email ?? null);
        setReady(true);
      } catch {
        router.replace("/login");
      }
    };
    loadSession();
  }, [router]);

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
    intervalId = setInterval(loadNotifications, 30000);

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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="w-full flex items-center justify-end">
        {/* <div className="relative w-full max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search employees, projects..."
            className="w-full bg-background pl-8 md:w-[300px] lg:w-[400px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div> */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
            <Label htmlFor="theme-mode" className="text-sm">
              Dark Mode
            </Label>
            <Switch
              id="theme-mode"
              checked={theme === "dark"}
              onCheckedChange={handleThemeToggle}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full relative"
              >
                <Bell className="h-[1.2rem] w-[1.2rem]" />
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
              <Button variant="outline" size="icon" className="rounded-full">
                <User className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">User menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* <DropdownMenuSeparator />

              <DropdownMenuSeparator />
              <DropdownMenuItem className="md:hidden cursor-pointer">
                <Moon className="mr-2 h-4 w-4" />
                <span>Dark Mode</span>
                <div className="ml-auto">
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={handleThemeToggle}
                  />
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="md:hidden" /> */}
              <DropdownMenuItem
                className="cursor-pointer"
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
