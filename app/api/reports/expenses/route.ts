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

  // Status filter
  const status = searchParams.get("status");
  if (status && status !== "all") {
    where.status = status;
  }

  // Expense Type filter
  const expenseType = searchParams.get("expenseType");
  if (expenseType && expenseType !== "all") {
    where.expenseType = expenseType;
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

  // Route filter
  const routeId = searchParams.get("routeId");
  if (routeId && routeId !== "all") {
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      select: { routeNo: true },
    });

    if (route) {
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
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ expenses });
}
