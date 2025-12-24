"use client";

import { Card, Avatar, List } from "antd";
import Link from "next/link";
import { useLayout } from "@/components/layout/layout-provider";

export function RecentEmployees() {
  const { employees } = useLayout();

  const recent = Array.isArray(employees)
    ? [...employees]
        .filter((e) => e.joinDate)
        .sort(
          (a, b) =>
            new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime()
        )
        .slice(0, 4)
    : [];

  return (
    <Card
      title="Recently Joined Employees"
      className="shadow-sm hover:shadow-md transition-shadow h-full"
    >
      <List
        itemLayout="horizontal"
        dataSource={recent}
        renderItem={(employee) => (
          <List.Item>
            <List.Item.Meta
              avatar={
                <Avatar
                  src={employee.avatar || "/placeholder.svg?height=40&width=40"}
                />
              }
              title={
                <Link
                  href={`/dashboard/employees/${employee.id}`}
                  className="text-sky-600 hover:underline"
                >
                  {employee.employeeName}
                </Link>
              }
              description={
                <div className="text-xs">
                  <p>
                    {employee.position} • {employee.department}
                  </p>
                  <p className="text-gray-500">
                    Joined: {new Date(employee.joinDate).toLocaleDateString()}
                  </p>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
}
