"use client";

import { useEffect, useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PayrollManager } from "@/components/payroll/payroll-manager";
import { IncentiveManager } from "@/components/payroll/incentive-manager";

export default function PayrollPage() {
  const [mounted, setMounted] = useState(false);
  const [month, setMonth] = useState<string>(new Date().getMonth() + 1 + "");
  const [year, setYear] = useState<string>(new Date().getFullYear() + "");
  const [locationId, setLocationId] = useState<string>("all");
  const [locations, setLocations] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    const init = async () => {
        try {
            const [locRes, userRes] = await Promise.all([
                fetch("/api/locations"),
                fetch("/api/auth/me")
            ]);
            const locations = await locRes.json();
            if (locRes.ok) setLocations(locations.locations);
            if (userRes.ok) setUser(await userRes.json());
        } catch (err) {
            console.error(err);
        }
        setMounted(true);
    };
    init();
  }, []);

  const currentMonthName = useMemo(() => {
    const m = parseInt(month);
    if (isNaN(m) || m < 1 || m > 12) return "-";
    return new Date(0, m - 1).toLocaleString('default', { month: 'long' });
  }, [month]);

  if (!mounted) return null;

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto px-4 sm:px-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0A192F] dark:text-white">Payroll & Incentives</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Manage monthly salaries, incentives, and deductions for {currentMonthName} {year}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-[130px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {new Date(0, i).toLocaleString('default', { month: 'long' })}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-[100px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                    {[2024, 2025, 2026, 2027].map(y => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger className="w-[180px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations?.map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>

      <Tabs defaultValue="payroll" className="w-full">
        <TabsList className="bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl mb-6">
          <TabsTrigger value="payroll" className="rounded-lg px-8 py-1.5 data-[state=active]:bg-slate-900 data-[state=active]:text-white">
            Payroll
          </TabsTrigger>
          <TabsTrigger value="incentives" className="rounded-lg px-8 py-1.5 data-[state=active]:bg-slate-900 data-[state=active]:text-white">
            Incentives & Deductions
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="payroll" className="mt-0 focus-visible:outline-none">
          <PayrollManager month={month} year={year} locationId={locationId} />
        </TabsContent>
        
        <TabsContent value="incentives" className="mt-0 focus-visible:outline-none">
          <IncentiveManager month={month} year={year} locationId={locationId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
