"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

type Task = {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  dueDate: string;
  module: string;
  href: string;
};

export function PendingTasks() {
  const tasks: Task[] = [
    {
      id: "1",
      title: "Approve Leave Requests",
      description: "3 pending leave applications",
      priority: "high",
      dueDate: "Today",
      module: "Leave",
      href: "/dashboard/leave-management",
    },
    {
      id: "2",
      title: "Review Expense Claims",
      description: "5 expenses awaiting approval",
      priority: "high",
      dueDate: "Today",
      module: "Expenses",
      href: "/dashboard/expenses",
    },
    {
      id: "3",
      title: "Process Payroll",
      description: "Monthly payroll due",
      priority: "medium",
      dueDate: "2 days",
      module: "Payroll",
      href: "/dashboard/payroll",
    },
    {
      id: "4",
      title: "Update Employee Records",
      description: "4 incomplete profiles",
      priority: "low",
      dueDate: "This week",
      module: "Employees",
      href: "/dashboard/employees",
    },
  ];

  const priorityColors = {
    high: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };

  const priorityIcons = {
    high: AlertTriangle,
    medium: Clock,
    low: CheckCircle2,
  };

  return (
    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B]">
      <CardHeader className="border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
            Pending Tasks
          </CardTitle>
          <Badge variant="secondary" className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
            {tasks.length} items
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {tasks.map((task) => {
            const Icon = priorityIcons[task.priority];
            return (
              <Link key={task.id} href={task.href}>
                <div className="group p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${priorityColors[task.priority]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                          {task.title}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {task.module}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                        {task.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          Due: {task.dueDate}
                        </span>
                        <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
