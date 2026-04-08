import { AdminRequestManagement } from "@/components/admin-requests/admin-request-management"
import { RoleGuard } from "@/components/dashboard/role-guard"

export default function AdminRequestsPage() {
  return (
    <RoleGuard>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Request to Admin</h1>
        <AdminRequestManagement />
      </div>
    </RoleGuard>
  )
}
