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
  const isAdmin = isAdminUser(user);
  const canViewAllLocations = isAdmin || isAccountant;
  const locationId = canViewAllLocations ? searchParams.get("locationId") : null;
  
  const where: any = canViewAllLocations
    ? locationId
      ? { locationId }
      : {}
    : { locationId: user.locationId };

  if (isAccountant && !isAdminUser(user)) {
    where.disburseType = "Cheque / Online Transfer";
  }

  // Status filter
  const status = searchParams.get("status");
  if (status && status !== "all") {
    if (status.includes(",")) {
      where.status = { in: status.split(",") };
    } else {
      where.status = status;
    }
  }

  // Expense Type filter
  const expenseType = searchParams.get("expenseType");
  if (expenseType && expenseType !== "all") {
    where.OR = [
      { expenseType: { name: expenseType } },
      { expenseTypeId: expenseType }
    ];
  }

  // Amount range filter
  const minAmount = searchParams.get("minAmount");
  const maxAmount = searchParams.get("maxAmount");
  if (minAmount || maxAmount) {
    where.amount = {};
    if (minAmount) where.amount.gte = Number.parseFloat(minAmount);
    if (maxAmount) where.amount.lte = Number.parseFloat(maxAmount);
  }

  // Date range filter
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      where.createdAt.gte = start;
    }
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  let targetRouteNo: string | null = null;
  let targetVehicleNo: string | null = null;

  // Route filter
  const routeId = searchParams.get("routeId");
  if (routeId && routeId !== "all") {
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      select: { routeNo: true },
    });

    if (route) {
      targetRouteNo = route.routeNo;
      if (!where.AND) where.AND = [];
      where.AND.push({
        OR: [
          { routeId: routeId },
          { items: { array_contains: [{ routeNo: route.routeNo }] } },
        ],
      });
    } else {
      where.routeId = routeId;
    }
  }

  // Vehicle filter
  const vehicleId = searchParams.get("vehicleId");
  if (vehicleId && vehicleId !== "all") {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { vehicleNo: true },
    });

    if (vehicle) {
      targetVehicleNo = vehicle.vehicleNo;
      if (!where.AND) where.AND = [];
      where.AND.push({
        OR: [
          { vehicleId: vehicleId },
          { items: { array_contains: [{ vehicleNo: vehicle.vehicleNo }] } },
        ],
      });
    } else {
      where.vehicleId = vehicleId;
    }
  }

  const expenses = await prisma.expenseSheet.findMany({
    where,
    include: {
      location: true,
      createdBy: true,
      approvedBy: true,
      disbursedBy: true,
      route: true,
      vehicle: true,
      expenseType: true,
    },
    orderBy: { createdAt: "desc" },
  });

  let processedExpenses = expenses;

  // If filtering by route or vehicle, we should only return the amount for that specific route/vehicle
  // if the expense sheet contains multiple items.
  if (targetRouteNo || targetVehicleNo) {
    processedExpenses = expenses.map(expense => {
      const items = (expense.items as any[]) || [];
      if (items.length > 0) {
        const filteredAmount = items.reduce((sum, item) => {
          let matches = true;
          // if (targetRouteNo && item.routeNo !== targetRouteNo) matches = false;
          if (targetVehicleNo && item.vehicleNo !== targetVehicleNo) matches = false;
          
          if (matches) {
            return sum + (Number(item.amount) || 0);
          }
          return sum;
        }, 0);
        
        // Only override if we found matching items. If no items matched but the record was returned,
        // it means it matched via the top-level routeId/vehicleId.
        if (filteredAmount > 0) {
          return { ...expense, amount: filteredAmount };
        }
      }
      return expense;
    });
  }

  return NextResponse.json({ expenses: processedExpenses });
}
