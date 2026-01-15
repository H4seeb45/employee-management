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

  if (!isCashier && !isBM && !isAdminUser(user)) {
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
  const locationId = isSuperAdmin ? searchParams.get("locationId") : null;
  const where = isSuperAdmin
    ? locationId
      ? { locationId }
      : {}
    : { locationId: user.locationId };
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
  const attachments = Array.isArray(body?.attachments) ? body.attachments : [];

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
      locationId: user.locationId,
      createdById: user.id,
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
    include: { attachments: true, location: true },
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
