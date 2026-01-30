import { NextResponse, type NextRequest } from "next/server";
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
  const canViewAllLocations = isSuperAdmin || isAccountant;
  const locationId = canViewAllLocations ? searchParams.get("locationId") : null;
  
  // Build where clause with search filters
  const where: any = canViewAllLocations
    ? locationId
      ? { locationId }
      : {}
    : { locationId: user.locationId };

  // Cashiers can only see Cash disburse type expenses
  if (isCashier && !isAdminUser(user)) {
    where.disburseType = "Cash";
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
    where.expenseType = expenseType;
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

  // Search by route
  const routeId = searchParams.get("routeId");
  if (routeId) {
    where.routeId = routeId;
  }

  // Search by vehicle
  const vehicleId = searchParams.get("vehicleId");
  if (vehicleId) {
    where.vehicleId = vehicleId;
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
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
  });

  return NextResponse.json({
    expenses,
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
  const expenseType = body?.expenseType?.toString();
  const amount = Number.parseFloat(body?.amount);
  const details = body?.details?.toString() ?? null;
  const disburseType = body?.disburseType?.toString() ?? "Cash";
  const attachments = Array.isArray(body?.attachments) ? body.attachments : [];
  const routeId = body?.routeId?.toString() ?? null;
  const vehicleId = body?.vehicleId?.toString() ?? null;

  if (!expenseType || Number.isNaN(amount)) {
    return NextResponse.json(
      { message: "Expense type and amount are required." },
      { status: 400 }
    );
  }

  const location = await prisma.location.findUnique({
    where: { id: user.locationId },
    select: { monthlyPettyCashLimit: true },
  });

  if (location?.monthlyPettyCashLimit && location.monthlyPettyCashLimit > 0) {
    const { start, end } = getMonthRange();
    const totalThisMonth = await prisma.expenseSheet.aggregate({
      where: {
        locationId: user.locationId,
        createdAt: { gte: start, lt: end },
        status: { not: "REJECTED" },
      },
      _sum: { amount: true },
    });
    const used = totalThisMonth._sum.amount ?? 0;
    if (used + amount > location.monthlyPettyCashLimit) {
      return NextResponse.json(
        { message: "Monthly petty cash limit exceeded." },
        { status: 400 }
      );
    }
  }

  const created = await prisma.expenseSheet.create({
    data: {
      expenseType,
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
    include: { attachments: true, location: true, route: true, vehicle: true },
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
        message: `A new expense sheet for ${created.expenseType} was submitted.`,
        link: "/dashboard/expenses",
      })),
    });
  }

  return NextResponse.json({ expense: created }, { status: 201 });
}
