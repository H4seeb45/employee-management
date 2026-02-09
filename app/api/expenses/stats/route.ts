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
  const isAccountant = hasRole(user, "Accountant");

  if (!isCashier && !isBM && !isAccountant && !isAdminUser(user)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const isSuperAdmin = isSuperAdminUser(user);
  const canViewAllLocations = isSuperAdmin || isAccountant;
  const locationId = canViewAllLocations ? searchParams.get("locationId") : null;
  
  const where: any = canViewAllLocations
    ? locationId
      ? { locationId }
      : {}
    : { locationId: user.locationId };

  if (isCashier && !isAdminUser(user)) {
    where.disburseType = "Cash";
  }

  // Search by ID
  const searchId = searchParams.get("searchId");
  if (searchId) {
    where.OR = [
      { id: { contains: searchId, mode: "insensitive" } },
      { details: { contains: searchId, mode: "insensitive" } }
    ];
  }

  // Apply filters to summary stats if provided
  const status = searchParams.get("status");
  if (status && status !== "all") where.status = status;

  const expenseType = searchParams.get("expenseType");
  if (expenseType && expenseType !== "all") where.expenseType = expenseType;

  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = new Date(new Date(fromDate).setHours(0, 0, 0, 0));
    if (toDate) where.createdAt.lte = new Date(new Date(toDate).setHours(23, 59, 59, 999));
  }

  const minAmount = searchParams.get("minAmount");
  const maxAmount = searchParams.get("maxAmount");
  if (minAmount || maxAmount) {
    where.amount = {};
    if (minAmount) where.amount.gte = Number.parseFloat(minAmount);
    if (maxAmount) where.amount.lte = Number.parseFloat(maxAmount);
  }

  const routeId = searchParams.get("routeId");
  if (routeId && routeId !== "all") where.routeId = routeId;

  const vehicleId = searchParams.get("vehicleId");
  if (vehicleId && vehicleId !== "all") where.vehicleId = vehicleId;

  // Get month range
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [statusRows, typeRows, monthlySpent, monthlyTypeRows, budget] = await Promise.all([
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
        ...(isSuperAdmin && locationId ? { locationId } : !isSuperAdmin ? { locationId: user.locationId } : {}),
        createdAt: { gte: startOfMonth, lt: endOfMonth },
        status: { not: "REJECTED" },
      },
      _sum: { amount: true },
    }),
    prisma.expenseSheet.groupBy({
      by: ["expenseType"],
      where: {
        ...(isSuperAdmin && locationId ? { locationId } : !isSuperAdmin ? { locationId: user.locationId } : {}),
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

  const monthlyTypeTotals = monthlyTypeRows.reduce<Record<string, number>>((acc: Record<string, number>, row: any) => {
    acc[row.expenseType] = row._sum.amount ?? 0;
    return acc;
  }, {});

  const budgetInfo = {
    totalBudget: budget?.status === "APPROVED" ? budget.amount : 0,
    spentThisMonth: monthlySpent._sum.amount ?? 0,
    remainingBudget: (budget?.status === "APPROVED" ? budget.amount : 0) - (monthlySpent._sum.amount ?? 0),
    hasApprovedBudget: budget?.status === "APPROVED",
    categories: budget?.status === "APPROVED" ? budget.categories : {}
  };

  return NextResponse.json({ statusCounts, typeTotals, monthlyTypeTotals, budgetInfo });
}
