"use client";

import { Card } from "antd";
import dynamic from "next/dynamic";
import { LineChart, type LineChartProps } from "@/components/ui/chart";
import { useEffect, useState } from "react";
import { useLayout } from "@/components/layout/layout-provider";
import { Loader2 } from "lucide-react";

// Dynamically import the chart to avoid SSR issues
const Chart = dynamic(() => Promise.resolve(LineChart), { ssr: false });

function weekdayLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

export function EmployeeActivity() {
  const { attendance } = useLayout();
  const [chartData, setChartData] = useState<LineChartProps | null>(null);

  useEffect(() => {
    // Build last 7 days labels
    const today = new Date();
    const days: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(d);
    }

    const labels = days.map(weekdayLabel);

    // Initialize counts
    const checkIns = new Array(7).fill(0);
    const checkOuts = new Array(7).fill(0);

    if (Array.isArray(attendance)) {
      const att = attendance;
      for (const rec of att) {
        if (!rec?.date) continue;
        const recDate = new Date(rec.date);
        // Find matching day index
        for (let i = 0; i < days.length; i++) {
          const d = days[i];
          if (
            recDate.getFullYear() === d.getFullYear() &&
            recDate.getMonth() === d.getMonth() &&
            recDate.getDate() === d.getDate()
          ) {
            if (rec.checkIn) checkIns[i] += 1;
            if (rec.checkOut) checkOuts[i] += 1;
          }
        }
      }
    }

    setChartData({
      data: {
        labels,
        datasets: [
          {
            label: "Check-ins",
            data: checkIns,
            borderColor: "#0ea5e9",
            backgroundColor: "rgba(14, 165, 233, 0.5)",
            tension: 0.3,
          },
          {
            label: "Check-outs",
            data: checkOuts,
            borderColor: "#f97316",
            backgroundColor: "rgba(249, 115, 22, 0.5)",
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "top" },
        },
        scales: { y: { beginAtZero: true } },
      },
    });
  }, [attendance]);

  return (
    <Card
      title="Weekly Activity"
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
