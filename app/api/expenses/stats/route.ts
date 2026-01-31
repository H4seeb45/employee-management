import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  hasRole,
  isAdminUser,
  isSuperAdminUser,
} from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const isCashier = hasRole(user, "Cashier");
  const isBM = hasRole(user, "Business Manager");

  if (!isCashier && !isBM && !isAdminUser(user)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const isSuperAdmin = isSuperAdminUser(user);
  const locationId = isSuperAdmin ? searchParams.get("locationId") : null;
  const where = isSuperAdmin
    ? locationId
      ? { locationId }
      : {}
    : { locationId: user.locationId };

  // Get month range
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [statusRows, typeRows, monthlySpent, budget] = await Promise.all([
    prisma.expenseSheet.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    prisma.expenseSheet.groupBy({
      by: ["expenseType"],
      where,
      _sum: { amount: true },
    }),
    prisma.expenseSheet.aggregate({
      where: {
        ...where,
        createdAt: { gte: startOfMonth, lt: endOfMonth },
        status: { not: "REJECTED" },
      },
      _sum: { amount: true },
    }),
    prisma.budget.findUnique({
      where: { locationId: isSuperAdmin && locationId ? locationId : user.locationId },
    })
  ]);

  const statusCounts = statusRows.reduce<Record<string, number>>(
    (acc: Record<string, number>, row: any) => {
      acc[row.status] = row._count._all;
      return acc;
    },
    {}
  );

  const typeTotals = typeRows.reduce<Record<string, number>>((acc: Record<string, number>, row: any) => {
    acc[row.expenseType] = row._sum.amount ?? 0;
    return acc;
  }, {});

  const budgetInfo = {
    totalBudget: budget?.status === "APPROVED" ? budget.amount : 0,
    spentThisMonth: monthlySpent._sum.amount ?? 0,
    remainingBudget: (budget?.status === "APPROVED" ? budget.amount : 0) - (monthlySpent._sum.amount ?? 0),
    hasApprovedBudget: budget?.status === "APPROVED"
  };

  return NextResponse.json({ statusCounts, typeTotals, budgetInfo });
}
