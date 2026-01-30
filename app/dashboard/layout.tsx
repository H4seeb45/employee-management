import type React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { RoleGuard } from "@/components/dashboard/role-guard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0A192F]">
      <AppSidebar />
      <div className="flex flex-col flex-1 w-full md:ml-64 transition-all duration-300 ease-in-out">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 space-y-6">
          <RoleGuard>{children}</RoleGuard>
        </main>
      </div>
    </div>
  )
}
