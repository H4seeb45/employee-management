"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  BarChart,
  type BarChartProps,
  DoughnutChart,
  type DoughnutChartProps,
} from "@/components/ui/chart";

const StatusChart = dynamic(() => Promise.resolve(DoughnutChart), {
  ssr: false,
});
const TypeChart = dynamic(() => Promise.resolve(BarChart), { ssr: false });

type ExpenseStats = {
  statusCounts: Record<string, number>;
  typeTotals: Record<string, number>;
};

const expenseTypes = [
  { value: "VEHICLES_FUEL", label: "Vehicles Fuel" },
  { value: "VEHICLES_RENTAL", label: "Vehicles Rental" },
  { value: "WAREHOUSE_RENTAL", label: "Warehouse Rental" },
  { value: "SALARIES", label: "Salaries" },
  { value: "ADVANCES_TO_EMP", label: "Advances To Emp" },
  { value: "ENTERTAINMENT", label: "Entertainment" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "REPAIR_MAINTENANCE", label: "Repair & Maintenance" },
  { value: "STATIONERY", label: "Stationery" },
  { value: "KITCHEN_EXPENSE", label: "Kitchen Expense" },
];

export function ExpenseCharts({ locationId }: { locationId?: string | null }) {
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      setStats(null);
      try {
        const params = new URLSearchParams();
        if (locationId) {
          params.set("locationId", locationId);
        }
        const url = params.toString()
          ? `/api/expenses/stats?${params.toString()}`
          : "/api/expenses/stats";
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) return;
        setStats({
          statusCounts: data.statusCounts ?? {},
          typeTotals: data.typeTotals ?? {},
        });
      } catch {
        // ignore chart errors
      } finally {
        setIsLoading(false);
      }
    };
    loadStats();
  }, [locationId]);

  const statusChart = useMemo<DoughnutChartProps | null>(() => {
    if (!stats || Object.keys(stats.statusCounts).length === 0) return null;
    const labels = ["PENDING", "APPROVED", "REJECTED", "DISBURSED"].filter(
      (status) => stats.statusCounts[status]
    );
    const data = labels.map((label) => stats.statusCounts[label]);
    return {
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: [
              "rgba(245, 158, 11, 0.7)",
              "rgba(59, 130, 246, 0.7)",
              "rgba(239, 68, 68, 0.7)",
              "rgba(16, 185, 129, 0.7)",
            ],
            borderColor: "rgba(255,255,255,0.9)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "bottom" } },
        cutout: "60%",
      },
    };
  }, [stats]);

  const typeChart = useMemo<BarChartProps | null>(() => {
    if (!stats || Object.keys(stats.typeTotals).length === 0) return null;
    const totals = expenseTypes.map((type) => stats.typeTotals[type.value] || 0);
    return {
      data: {
        labels: expenseTypes.map((type) => type.label),
        datasets: [
          {
            label: "Amount",
            data: totals,
            backgroundColor: "rgba(14, 165, 233, 0.6)",
            borderColor: "rgba(14, 165, 233, 1)",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: { beginAtZero: true },
        },
      },
    };
  }, [stats]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Expenses by Status</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[220px]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : statusChart ? (
            <StatusChart {...statusChart} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No expense data available.
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Expenses by Type</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[220px]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : typeChart ? (
            <TypeChart {...typeChart} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No expense data available.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
