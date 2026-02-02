"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  Banknote,
  FileText,
  UserPlus,
  ArrowRight,
  Activity,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { useLayout } from "@/components/layout/layout-provider";
import Link from "next/link";
import { AttendanceOverview } from "@/components/dashboard/attendance-overview";
import { PendingTasks } from "@/components/dashboard/pending-tasks";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";

type Location = {
  id: string;
  name: string;
  city: string;
};

type StatCard = {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  icon: React.ElementType;
  color: string;
  bgGradient: string;
};

export default function DashboardPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("all");
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const { employees, attendance, user, userLoading } = useLayout();
  const isSuperAdmin = user?.roles?.includes("Super Admin") ?? false;

  useEffect(() => {
    if (isSuperAdmin && !userLoading) {
      setIsLoadingLocations(true);
      fetch("/api/locations")
        .then(res => res.json())
        .then(data => {
          if (data.locations || Array.isArray(data)) {
            setLocations(data.locations ?? data ?? []);
          }
        })
        .catch(err => console.error("Failed to load locations", err))
        .finally(() => setIsLoadingLocations(false));
    }
  }, [isSuperAdmin, userLoading]);

  const totalEmployees = employees?.length ?? 0;
  const presentToday = attendance?.filter((a) => a?.status === "Present").length ?? 0;
  const onLeave = employees?.filter((e) => e?.status === "On Leave").length ?? 0;
  const attendanceRate = totalEmployees > 0 ? ((presentToday / totalEmployees) * 100).toFixed(0) : 0;

  const stats: StatCard[] = [
    {
      title: "Total Employees",
      value: totalEmployees.toString(),
      change: "+12% from last month",
      trend: "up",
      icon: Users,
      color: "text-blue-600",
      bgGradient: "from-blue-500/10 to-blue-600/10",
    },
    {
      title: "Present Today",
      value: presentToday.toString(),
      change: `${attendanceRate}% attendance rate`,
      trend: "up",
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgGradient: "from-emerald-500/10 to-emerald-600/10",
    },
    {
      title: "On Leave",
      value: onLeave.toString(),
      change: `${totalEmployees > 0 ? ((onLeave / totalEmployees) * 100).toFixed(0) : 0}% of workforce`,
      trend: "neutral",
      icon: Calendar,
      color: "text-amber-600",
      bgGradient: "from-amber-500/10 to-amber-600/10",
    },
    {
      title: "Pending Approvals",
      value: "7",
      change: "3 urgent items",
      trend: "down",
      icon: AlertCircle,
      color: "text-rose-600",
      bgGradient: "from-rose-500/10 to-rose-600/10",
    },
  ];

  const quickActions = [
    { label: "Add Employee", icon: UserPlus, href: "/dashboard/employees", color: "blue" },
    { label: "Mark Attendance", icon: Clock, href: "/dashboard/attendance", color: "emerald" },
    { label: "Submit Expense", icon: Banknote, href: "/dashboard/expenses", color: "amber" },
    { label: "Leave Request", icon: FileText, href: "/dashboard/leave-management", color: "purple" },
  ];

  const recentActivity = [
    { action: "New employee added", user: "Sarah Khan", time: "2 min ago", type: "success" },
    { action: "Expense approved", user: "Ahmed Ali", time: "15 min ago", type: "success" },
    { action: "Leave request pending", user: "Fatima Hassan", time: "1 hour ago", type: "warning" },
    { action: "Payroll processed", user: "System", time: "2 hours ago", type: "info" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <WelcomeBanner userName="Admin" />

      {/* Location Filter for Super Admin */}
      {isSuperAdmin && (
        <div className="flex justify-end">
          <div className="flex items-center gap-3">
            <Label className="text-sm text-slate-600 dark:text-slate-400">Location</Label>
            <Select
              value={selectedLocationId}
              onValueChange={setSelectedLocationId}
              disabled={isLoadingLocations}
            >
              <SelectTrigger className="w-[220px] bg-white dark:bg-[#1E293B] border-slate-300 dark:border-slate-700">
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
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="relative overflow-hidden border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] hover:shadow-lg transition-all duration-300 group">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-50`} />
              <CardContent className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.bgGradient} group-hover:scale-110 transition-transform`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  {stat.trend === "up" ? (
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                  ) : stat.trend === "down" ? (
                    <TrendingDown className="h-5 w-5 text-rose-500" />
                  ) : null}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    {stat.value}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    {stat.change}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B]">
          <CardHeader className="border-b border-slate-100 dark:border-slate-700">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {quickActions.map((action) => (
              <Link key={action.label} href={action.href}>
                <Button
                  variant="ghost"
                  className="w-full justify-start hover:bg-slate-100 dark:hover:bg-slate-800 group"
                >
                  <action.icon className={`h-5 w-5 mr-3 text-${action.color}-600`} />
                  <span className="text-slate-700 dark:text-slate-300">{action.label}</span>
                  <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B]">
          <CardHeader className="border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                Recent Activity
              </CardTitle>
              <Activity className="h-5 w-5 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div
                    className={`h-2 w-2 rounded-full mt-2 ${
                      activity.type === "success"
                        ? "bg-emerald-500"
                        : activity.type === "warning"
                        ? "bg-amber-500"
                        : "bg-blue-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {activity.action}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {activity.user} · {activity.time}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      activity.type === "success"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : activity.type === "warning"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }
                  >
                    {activity.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AttendanceOverview />
        <PendingTasks />
      </div>
    </div>
  );
}
