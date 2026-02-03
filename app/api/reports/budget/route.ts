import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser, isSuperAdminUser, hasRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const isAccountant = hasRole(user, "Accountant");
  const isBM = hasRole(user, "Business Manager");
  if (!isBM && !isAccountant && !isAdminUser(user)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const isSuperAdmin = isSuperAdminUser(user);
  const locationId = (isSuperAdmin || isAccountant) ? searchParams.get("locationId") : user.locationId;

  const where: any = locationId ? { locationId } : {};

  // For budget report, we want the current month's budget and expenses
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const budgets = await prisma.budget.findMany({
    where,
    include: { location: true },
  });

  const expenses = await prisma.expenseSheet.groupBy({
    by: ["expenseType", "locationId"],
    where: {
      ...where,
      createdAt: { gte: startOfMonth, lt: endOfMonth },
      status: { not: "REJECTED" },
    },
    _sum: { amount: true },
  });

  const report = budgets.map(budget => {
    const categories = (budget.categories as Record<string, number>) || {};
    const categoryReport = Object.entries(categories).map(([type, limit]) => {
      const spent = expenses.find(e => e.expenseType === type && e.locationId === budget.locationId)?._sum?.amount || 0;
      return {
        type,
        limit,
        spent,
        left: limit - spent,
      };
    });

    const totalSpent = categoryReport.reduce((sum, c) => sum + c.spent, 0);
    return {
      id: budget.id,
      location: budget.location,
      totalBudget: budget.amount,
      totalSpent,
      totalLeft: budget.amount - totalSpent,
      categories: categoryReport,
      status: budget.status,
      updatedAt: budget.updatedAt,
    };
  });

  return NextResponse.json({ report });
}
