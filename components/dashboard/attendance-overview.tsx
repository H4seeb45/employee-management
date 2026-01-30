"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export function AttendanceOverview() {
  // Mock data - in production this would come from an API
  const weekData = [
    { day: "Mon", present: 95, absent: 5 },
    { day: "Tue", present: 92, absent: 8 },
    { day: "Wed", present: 98, absent: 2 },
    { day: "Thu", present: 94, absent: 6 },
    { day: "Fri", present: 89, absent: 11 },
  ];

  const maxValue = 100;

  return (
    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B]">
      <CardHeader className="border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
            Attendance Overview
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="h-4 w-4" />
            <span className="font-medium">+5.2%</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          This week's attendance trends
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {weekData.map((data, index) => (
            <div key={data.day} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">{data.day}</span>
                <div className="flex items-center gap-6">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{data.present}%</span>
                  <span className="text-slate-400 text-xs">{data.absent}% absent</span>
                </div>
              </div>
              <div className="relative h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${data.present}%`,
                    animationDelay: `${index * 100}ms`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-600 dark:text-slate-400">Present</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-600" />
            <span className="text-xs text-slate-600 dark:text-slate-400">Absent</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
