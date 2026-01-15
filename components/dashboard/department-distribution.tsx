"use client";

import { Card } from "antd";
import dynamic from "next/dynamic";
import { DoughnutChart, type DoughnutChartProps } from "@/components/ui/chart";
import { useEffect, useState } from "react";
import { useLayout } from "@/components/layout/layout-provider";
import { Loader2 } from "lucide-react";

// Dynamically import the chart to avoid SSR issues
const Chart = dynamic(() => Promise.resolve(DoughnutChart), { ssr: false });

export function DepartmentDistribution() {
  const { employees } = useLayout();
  const [chartData, setChartData] = useState<DoughnutChartProps | null>(null);

  useEffect(() => {
    const counts: Record<string, number> = {};
    if (Array.isArray(employees)) {
      for (const e of employees) {
        const dept = e.department || "Unassigned";
        counts[dept] = (counts[dept] || 0) + 1;
      }
    }

    const labels = Object.keys(counts);
    const data = labels.map((l) => counts[l]);

    setChartData({
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: [
              "rgba(14, 165, 233, 0.7)",
              "rgba(249, 115, 22, 0.7)",
              "rgba(139, 92, 246, 0.7)",
              "rgba(16, 185, 129, 0.7)",
              "rgba(245, 158, 11, 0.7)",
              "rgba(239, 68, 68, 0.7)",
            ],
            borderColor: labels.map(() => "rgba(255,255,255,0.9)"),
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "right" } },
        cutout: "60%",
      },
    });
  }, [employees]);

  return (
    <Card
      title="Department Distribution"
      className="shadow-sm hover:shadow-md transition-shadow h-full"
    >
      {chartData ? (
        <Chart {...chartData} />
      ) : (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
    </Card>
  );
}
