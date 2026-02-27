import { NextResponse, type NextRequest } from "next/server";
// import { ExpenseType as OldExpenseType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  hasRole,
  isAdminUser,
  isSuperAdminUser,
} from "@/lib/auth";

const getMonthRange = (date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
};

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
  const page = Math.max(
    1,
    Number.parseInt(searchParams.get("page") || "1", 10)
  );
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(searchParams.get("limit") || "10", 10))
  );
  const skip = (page - 1) * limit;

  const isSuperAdmin = isSuperAdminUser(user);
  const isAdmin = isAdminUser(user);
  const canViewAllLocations = isAdmin || isAccountant;
  const queryLocationId = searchParams.get("locationId");
  const authorizedIds = [
    user.locationId,
    ...(user.authorizedLocations?.map((l: any) => l.id) || []),
  ].filter(Boolean);

  // Build where clause with search filters
  const where: any = {};
  
  if (canViewAllLocations) {
    if (queryLocationId && queryLocationId !== "all") {
      where.locationId = queryLocationId;
    }
  } else {
    if (queryLocationId && queryLocationId !== "all") {
      // Check if requested location is in authorized list
      if (authorizedIds.includes(queryLocationId)) {
        where.locationId = queryLocationId;
      } else {
        // Fallback or explicit check - for now, just restrict to authorized
        where.locationId = { in: authorizedIds };
      }
    } else {
      where.locationId = { in: authorizedIds };
    }
  }

  // Cashiers can only see Cash disburse type expenses
  if (isCashier && !isAdminUser(user)) {
    where.disburseType = "Cash";
  }

  // Accountants can only see Cheque / Online Transfer disburse type expenses
  if (isAccountant && !isAdminUser(user)) {
    where.disburseType = "Cheque / Online Transfer";
  }

  // Search by ID
  const searchId = searchParams.get("searchId");
  if (searchId) {
    where.id = { contains: searchId, mode: "insensitive" };
  }

  // Search by status
  const status = searchParams.get("status");
  if (status) {
    where.status = status;
  }

  // Search by expense type
  const expenseType = searchParams.get("expenseType");
  if (expenseType) {
    where.OR = [
      { expenseType: { name: expenseType } },
      { expenseTypeId: expenseType }
    ];
  }

  // Search by amount range
  const minAmount = searchParams.get("minAmount");
  const maxAmount = searchParams.get("maxAmount");
  if (minAmount || maxAmount) {
    where.amount = {};
    if (minAmount) {
      where.amount.gte = Number.parseFloat(minAmount);
    }
    if (maxAmount) {
      where.amount.lte = Number.parseFloat(maxAmount);
    }
  }

  // Search by date range (based on creation date)
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) {
      // Set to start of the day
      const fromDateStart = new Date(fromDate);
      fromDateStart.setHours(0, 0, 0, 0);
      where.createdAt.gte = fromDateStart;
    }
    if (toDate) {
      // Set to end of the day (23:59:59.999)
      const toDateEnd = new Date(toDate);
      toDateEnd.setHours(23, 59, 59, 999);
      where.createdAt.lte = toDateEnd;
    }
  }

  let targetRouteNo: string | null = null;
  let targetVehicleNo: string | null = null;

  // Search by route
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

  // Search by vehicle
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

  const totalCount = await prisma.expenseSheet.count({ where });

  const expenses = await prisma.expenseSheet.findMany({
    where,
    include: {
      location: true,
      createdBy: true,
      approvedBy: true,
      rejectedBy: true,
      disbursedBy: true,
      attachments: true,
      route: true,
      vehicle: true,
      expenseType: true,
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
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
          // Follow user preference to skip route match validation in item sum if vehicle matches
          // if (targetRouteNo && item.routeNo !== targetRouteNo) matches = false;
          if (targetVehicleNo && item.vehicleNo !== targetVehicleNo) matches = false;
          
          if (matches) {
            return sum + (Number(item.amount) || 0);
          }
          return sum;
        }, 0);
        
        if (filteredAmount > 0) {
          return { ...expense, amount: filteredAmount };
        }
      }
      return expense;
    });
  }

  return NextResponse.json({
    expenses: processedExpenses,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    },
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }
  if (!hasRole(user, "Business Manager")) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const category = body?.category?.toString() ?? "Expense";
  const items = body?.items ?? null;
  const expenseType = body?.expenseType?.toString();
  const expenseTypeId = body?.expenseTypeId?.toString();
  const amount = Number.parseFloat(body?.amount);
  const details = body?.details?.toString() ?? null;
  const disburseType = body?.disburseType?.toString() ?? "Cash";
  const attachments = Array.isArray(body?.attachments) ? body.attachments : [];
  const routeId = body?.routeId?.toString() ?? null;
  const vehicleId = body?.vehicleId?.toString() ?? null;

  // If Fixed Asset, the type is implicitly FIXED_ASSET (old enum) or a dynamic type named "Fixed Asset"
  // let effectiveExpenseType = category === "Fixed Asset" ? "FIXED_ASSET" : expenseType;
  let effectiveExpenseType = expenseType;
  let effectiveExpenseTypeId = expenseTypeId;

  // Resolve name from ID if needed for budget checks
  if (effectiveExpenseTypeId && !effectiveExpenseType) {
    const type = await prisma.expenseType.findUnique({
      where: { id: effectiveExpenseTypeId }
    });
    if (type) {
      effectiveExpenseType = type.expenseCode;
    } else {
      // Fallback: if not found in dynamic types, the ID might be a static type string
      effectiveExpenseType = effectiveExpenseTypeId;
      effectiveExpenseTypeId = undefined; // Not a valid DB ID
    }
  } else if (effectiveExpenseTypeId) {
    // Both provided or just ID provided but name is already set
    // We still need to verify if the ID is valid to avoid FK violation
    const type = await prisma.expenseType.findUnique({
      where: { id: effectiveExpenseTypeId }
    });
    if (!type) {
      effectiveExpenseTypeId = undefined;
    }
    else {
      effectiveExpenseType = type.expenseCode;
    }
  }
  if (!effectiveExpenseTypeId && !effectiveExpenseType || Number.isNaN(amount)) {
    return NextResponse.json(
      { message: "Expense type and amount are required." },
      { status: 400 }
    );
  }

  // Validate items if provided (e.g. for Fixed Asset or Tolls & Taxes breakdown)
  if (items && Array.isArray(items) && items.length > 0) {
    const calculatedTotal = items.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0);
    // Use a small epsilon for float comparison
    if (Math.abs(calculatedTotal - amount) > 0.1) {
      return NextResponse.json(
        { message: `Total amount (${amount}) does not match sum of items (${calculatedTotal}).` },
        { status: 400 }
      );
    }
  } else if (category === "Fixed Asset" || (category === "Expense" && expenseType === "TOLLS_TAXES")) {
    return NextResponse.json(
      { message: "At least one fixed asset item is required." },
      { status: 400 }
    );
  }

  // Budget Check
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const budget = await prisma.budget.findUnique({
    where: { 
      locationId_month_year: {
        locationId: user.locationId,
        month: currentMonth,
        year: currentYear
      }
    },
  });

  if (!budget || budget.status !== "APPROVED") {
    return NextResponse.json(
      { message: "No approved budget found for this location. Please set a budget first." },
      { status: 400 }
    );
  }

  const { start, end } = getMonthRange();
  
  // 1. Check Category-Specific Limit
  const categories = budget.categories as Record<string, number> | null;
  const categoryLimit = categories ? categories[effectiveExpenseType] : null;

  if (categoryLimit !== null && categoryLimit !== undefined) {
    const categorySpent = await prisma.expenseSheet.aggregate({
      where: {
        locationId: user.locationId,
        OR: [
          { expenseTypeEnum: effectiveExpenseType as any },
          { expenseType: { name: effectiveExpenseType } }
        ],
        createdAt: { gte: start, lt: end },
        status: { not: "REJECTED" },
      },
      _sum: { amount: true },
    });

    const usedInCategory = categorySpent._sum.amount ?? 0;
    if (usedInCategory + amount > categoryLimit) {
      const remainingInCategory = categoryLimit - usedInCategory;
      return NextResponse.json(
        { 
          message: `Category limit exceeded for ${effectiveExpenseType}. Remaining category budget: ${remainingInCategory.toLocaleString("en-PK", { style: "currency", currency: "PKR" })} (Limit: ${categoryLimit.toLocaleString("en-PK", { style: "currency", currency: "PKR" })})` 
        },
        { status: 400 }
      );
    }
  } else{
    return NextResponse.json(
      { message: `Expense limit for ${effectiveExpenseType} not found in budget categories. Please set a budget for this expense type first.` },
      { status: 400 }
    );
  }

  // 2. Check Total Overall Budget Limit
  const totalThisMonth = await prisma.expenseSheet.aggregate({
    where: {
      locationId: user.locationId,
      createdAt: { gte: start, lt: end },
      status: { not: "REJECTED" },
    },
    _sum: { amount: true },
  });
  const usedTotal = totalThisMonth._sum.amount ?? 0;
  
  if (usedTotal + amount > budget.amount) {
    const remainingTotal = budget.amount - usedTotal;
    return NextResponse.json(
      { message: `Total monthly budget exceeded. Remaining: ${remainingTotal.toLocaleString("en-PK", { style: "currency", currency: "PKR" })} (Total Budget: ${budget.amount.toLocaleString("en-PK", { style: "currency", currency: "PKR" })})` },
      { status: 400 }
    );
  }

  const created = await prisma.expenseSheet.create({
    data: {
      category,
      expenseTypeId: effectiveExpenseTypeId || undefined,
      expenseTypeEnum: !effectiveExpenseTypeId ? (effectiveExpenseType as any) : undefined,
      items: items || undefined,
      amount,
      details,
      disburseType,
      locationId: user.locationId,
      createdById: user.id,
      routeId,
      vehicleId,
      attachments: {
        create: attachments.map((file: any) => ({
          url: file.url,
          fileKey: file.fileKey,
          fileName: file.fileName,
          fileType: file.fileType,
          fileSize: file.fileSize,
        })),
      },
    },
    include: { attachments: true, location: true, route: true, vehicle: true, expenseType: true },
  });

  const adminUsers = await prisma.user.findMany({
    where: {
      OR: [
        {
          locationId: user.locationId,
          roles: { some: { role: { name: "Admin" } } },
        },
        { roles: { some: { role: { name: "Super Admin" } } } },
      ],
    },
    select: { id: true },
  });

  if (adminUsers.length > 0) {
    await prisma.notification.createMany({
      data: adminUsers.map((admin) => ({
        userId: admin.id,
        title: "Expense awaiting approval",
        message: `A new expense sheet for ${effectiveExpenseType} was submitted.`,
        link: "/dashboard/expenses",
      })),
    });
  }

  return NextResponse.json({ expense: created }, { status: 201 });
}
