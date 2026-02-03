import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReportsModule } from "@/components/reports/reports-module";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

async function getRoles(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });
  return user?.roles.map((r) => r.role.name) || [];
}

export default async function ReportsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  
  if (!token) {
    redirect("/login");
  }

  const payload = await verifySessionToken(token);
  if (!payload?.userId) {
    redirect("/login");
  }

  const roles = await getRoles(payload.userId);
  const allowedRoles = ["Admin", "Super Admin", "Business Manager", "Accountant"];
  
  const isAllowed = roles.some(role => allowedRoles.includes(role));

  if (!isAllowed) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
          <p className="text-slate-500">You do not have permission to view the reports section.</p>
        </div>
      </div>
    );
  }

  return <ReportsModule roles={roles} />;
}
