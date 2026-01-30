import  EmployeeDirectory  from "@/components/employees/employee-directory"

export default function EmployeesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-[#0A192F] dark:text-white">Employee Directory</h1>
        <p className="text-slate-500 dark:text-slate-400">Manage your workforce, view profiles, and update status.</p>
      </div>
      <EmployeeDirectory />
    </div>
  )
}
