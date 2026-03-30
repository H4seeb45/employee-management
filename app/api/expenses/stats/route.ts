import { NextResponse, type NextRequest } from "next/server";
import { OldExpenseType } from "@prisma/client";
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
  const queryLocationId = searchParams.get("locationId");
  const authorizedIds = [
    user.locationId,
    ...(user.authorizedLocations?.map((l: any) => l.id) || []),
  ].filter(Boolean);

  const isSuperAdmin = isSuperAdminUser(user);
  const isAdmin = isAdminUser(user);
  const canViewAllLocations = isSuperAdmin || isAdmin || isAccountant;
  const locationId = queryLocationId;

  const where: any = {};
  
  if (canViewAllLocations) {
    if (queryLocationId && queryLocationId !== "all") {
      where.locationId = queryLocationId;
    }
  } else {
    if (queryLocationId && queryLocationId !== "all") {
      if (authorizedIds.includes(queryLocationId)) {
        where.locationId = queryLocationId;
      } else {
        where.locationId = { in: authorizedIds };
      }
    } else {
      where.locationId = { in: authorizedIds };
    }
  }

  if (isCashier && !isAdminUser(user)) {
    where.disburseType = "Cash";
  }

  if (isAccountant && !isAdminUser(user)) {
    where.disburseType = "Cheque / Online Transfer";
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
  if (expenseType && expenseType !== "all") {
    const isLegacyType = Object.values(OldExpenseType).includes(expenseType as any);
    where.OR = [
      ...(isLegacyType ? [{ expenseTypeEnum: expenseType as any }] : []),
      { expenseType: { name: expenseType } },
      { expenseTypeId: expenseType }
    ];
  }

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

  let targetRouteNo: string | null = null;
  let targetVehicleNo: string | null = null;

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

  // Get month range
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // For monthly spending and budget, we need to handle the locationId filter properly
  let statsLocationFilter: any = {};
  if (canViewAllLocations) {
    if (locationId && locationId !== "all") {
      statsLocationFilter = { locationId };
    }
  } else {
    if (locationId && locationId !== "all" && authorizedIds.includes(locationId)) {
      statsLocationFilter = { locationId };
    } else {
      statsLocationFilter = { locationId: { in: authorizedIds } };
    }
  }

  const statsWhere = {
    ...statsLocationFilter,
    // Apply filters to monthly stats as well
    ...(targetRouteNo || targetVehicleNo ? {
      AND: where.AND
    } : {})
  };

  const [statusRows, typeRecords, monthlyRecords, budget] = await Promise.all([
    prisma.expenseSheet.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    prisma.expenseSheet.findMany({
      where: {
        ...where,
        status: where.status || { not: "REJECTED" }
      },
      select: { expenseTypeEnum: true, expenseType: { select: { name: true } }, amount: true, items: true }
    } as any),
    prisma.expenseSheet.findMany({
      where: {
        ...statsWhere,
        createdAt: { gte: startOfMonth, lt: endOfMonth },
        status: { not: "REJECTED" },
      },
      select: { amount: true, expenseTypeEnum: true, expenseType: { select: { name: true } }, items: true }
    } as any),
    prisma.budget.findFirst({
      where: { 
        ...(statsLocationFilter.locationId ? { locationId: statsLocationFilter.locationId } : {}),
        month: now.getMonth() + 1,
        year: now.getFullYear()
      },
    })
  ]);

  const calculateTotalAmount = (records: any[]) => {
    return records.reduce((total, rec) => {
      let amount = rec.amount;
      const items = (rec.items as any[]) || [];
      
      if ((targetRouteNo || targetVehicleNo) && items.length > 0) {
        const filteredAmount = items.reduce((sum, item) => {
          let matches = true;
          // if (targetRouteNo && item.routeNo !== targetRouteNo) matches = false;
          if (targetVehicleNo && item.vehicleNo !== targetVehicleNo) matches = false;
          
          if (matches) {
            return sum + (Number(item.amount) || 0);
          }
          return sum;
        }, 0);
        
        if (filteredAmount > 0) {
          amount = filteredAmount;
        }
      }
      return total + amount;
    }, 0);
  };

  const statusCounts = statusRows.reduce<Record<string, number>>(
    (acc: Record<string, number>, row: any) => {
      acc[row.status] = row._count._all;
      return acc;
    },
    {}
  );

  const typeTotals = typeRecords.reduce<Record<string, number>>((acc: Record<string, number>, rec: any) => {
    let amount = rec.amount;
    const items = (rec.items as any[]) || [];
    
    if ((targetRouteNo || targetVehicleNo) && items.length > 0) {
      const filteredAmount = items.reduce((sum, item) => {
        let matches = true;
        // if (targetRouteNo && item.routeNo !== targetRouteNo) matches = false;
        if (targetVehicleNo && item.vehicleNo !== targetVehicleNo) matches = false;
        
        if (matches) {
          return sum + (Number(item.amount) || 0);
        }
        return sum;
      }, 0);
      
      if (filteredAmount > 0) amount = filteredAmount;
    }
    
    const typeLabel = rec.expenseType?.name || rec.expenseTypeEnum || "Unknown";
    acc[typeLabel] = (acc[typeLabel] || 0) + amount;
    return acc;
  }, {});

  const monthlyTypeTotals = monthlyRecords.reduce<Record<string, number>>((acc: Record<string, number>, rec: any) => {
    let amount = rec.amount;
    const items = (rec.items as any[]) || [];
    
    if ((targetRouteNo || targetVehicleNo) && items.length > 0) {
      const filteredAmount = items.reduce((sum, item) => {
        let matches = true;
        // if (targetRouteNo && item.routeNo !== targetRouteNo) matches = false;
        if (targetVehicleNo && item.vehicleNo !== targetVehicleNo) matches = false;
        
        if (matches) {
          return sum + (Number(item.amount) || 0);
        }
        return sum;
      }, 0);
      
      if (filteredAmount > 0) amount = filteredAmount;
    }
    
    const typeLabel = rec.expenseType?.name || rec.expenseTypeEnum || "Unknown";
    acc[typeLabel] = (acc[typeLabel] || 0) + amount;
    return acc;
  }, {});

  const totalMonthlySpent = calculateTotalAmount(monthlyRecords);

  const budgetInfo = {
    totalBudget: budget?.status === "APPROVED" ? budget.amount : 0,
    spentThisMonth: totalMonthlySpent,
    remainingBudget: (budget?.status === "APPROVED" ? budget.amount : 0) - totalMonthlySpent,
    hasApprovedBudget: budget?.status === "APPROVED",
    categories: budget?.status === "APPROVED" ? budget.categories : {}
  };

  return NextResponse.json({ statusCounts, typeTotals, monthlyTypeTotals, budgetInfo });
}
