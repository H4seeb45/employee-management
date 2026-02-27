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
  const isAdmin = isAdminUser(user);
  const locationId = (isAdmin || isAccountant) ? searchParams.get("locationId") : user.locationId;

  const where: any = locationId ? { locationId } : {};

  // For budget report, we want the current month's budget and expenses
  const now = new Date();
  const selectedMonth = searchParams.get("month") ? parseInt(searchParams.get("month")!) : now.getMonth() + 1;
  const selectedYear = searchParams.get("year") ? parseInt(searchParams.get("year")!) : now.getFullYear();
  
  const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
  const endOfMonth = new Date(selectedYear, selectedMonth, 1);

  const budgets = await prisma.budget.findMany({
    where: {
      ...where,
      month: selectedMonth,
      year: selectedYear,
    },
    include: { location: true },
  });

  const expensesRaw = await prisma.expenseSheet.findMany({
    where: {
      ...where,
      createdAt: { gte: startOfMonth, lt: endOfMonth },
      status: { not: "REJECTED" },
    },
    include: {
      expenseType: true
    },
  });

  // Group expenses by expenseCode/Enum and locationId
  const expensesGrouped: Record<string, number> = {};
  expensesRaw.forEach(e => {
    const code = e.expenseType?.expenseCode || e.expenseTypeEnum || "UNKNOWN";
    const key = `${code}_${e.locationId}`;
    expensesGrouped[key] = (expensesGrouped[key] || 0) + e.amount;
  });

  const report = budgets.map(budget => {
    const categories = (budget.categories as Record<string, number>) || {};
    const categoryReport = Object.entries(categories).map(([type, limit]) => {
      const spent = expensesGrouped[`${type}_${budget.locationId}`] || 0;
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
