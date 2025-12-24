"use client";

import { Card, List } from "antd";
import { Calendar, Briefcase } from "lucide-react";
import { useLayout } from "@/components/layout/layout-provider";

const getTypeColor = (type: string) => {
  switch (type) {
    case "deadline":
      return "#ef4444"; // red
    default:
      return "#3b82f6"; // blue
  }
};

export function UpcomingEvents() {
  const { projects } = useLayout();

  const upcoming = Array.isArray(projects)
    ? [...projects]
        .filter((p) => p.deadline)
        .map((p) => ({
          id: p.id,
          title: `Project: ${p.name}`,
          date: p.deadline,
          type: "deadline",
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 4)
    : [];

  return (
    <Card
      title="Upcoming Events"
      className="shadow-sm hover:shadow-md transition-shadow h-full"
    >
      <List
        itemLayout="horizontal"
        dataSource={upcoming}
        renderItem={(event) => {
          return (
            <List.Item>
              <div className="flex items-start w-full">
                <div className="flex-shrink-0 mr-4">
                  <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                  </div>
                </div>
                <div className="flex-grow">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{event.title}</h4>
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getTypeColor(event.type) }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(event.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </List.Item>
          );
        }}
      />
    </Card>
  );
}
