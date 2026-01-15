import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  hasRole,
  isAdminUser,
  isSuperAdminUser,
} from "@/lib/auth";

type RouteParams = { params: { id: string } };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const isSuperAdmin = isSuperAdminUser(user);
  const expense = await prisma.expenseSheet.findUnique({
    where: { id: params.id },
    include: {
      location: true,
      createdBy: true,
      approvedBy: true,
      rejectedBy: true,
      disbursedBy: true,
      attachments: true,
    },
  });

  if (!expense) {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }
  if (!isSuperAdmin && expense.locationId !== user.locationId) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json({ expense });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action?.toString();

  const expense = await prisma.expenseSheet.findUnique({
    where: { id: params.id },
  });
  if (!expense) {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }

  if (action === "approve") {
    if (!isAdminUser(user)) {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }
    if (!isSuperAdminUser(user) && expense.locationId !== user.locationId) {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }
    if (expense.status !== "PENDING") {
      return NextResponse.json(
        { message: "Only pending expenses can be approved." },
        { status: 400 }
      );
    }
    const updated = await prisma.expenseSheet.update({
      where: { id: params.id },
      data: {
        status: "APPROVED",
        approvedById: user.id,
        approvedAt: new Date(),
        rejectedById: null,
        rejectedAt: null,
      },
    });

    const cashierUsers = await prisma.user.findMany({
      where: {
        locationId: expense.locationId,
        roles: { some: { role: { name: "Cashier" } } },
      },
      select: { id: true },
    });

    if (cashierUsers.length > 0) {
      await prisma.notification.createMany({
        data: cashierUsers.map((cashier) => ({
          userId: cashier.id,
          title: "Expense ready for payout",
          message: "An expense sheet has been approved and is ready to disburse.",
          link: "/dashboard/expenses",
        })),
      });
    }

    return NextResponse.json({ expense: updated });
  }

  if (action === "reject") {
    if (!isAdminUser(user)) {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }
    if (!isSuperAdminUser(user) && expense.locationId !== user.locationId) {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }
    if (expense.status !== "PENDING") {
      return NextResponse.json(
        { message: "Only pending expenses can be rejected." },
        { status: 400 }
      );
    }
    const updated = await prisma.expenseSheet.update({
      where: { id: params.id },
      data: {
        status: "REJECTED",
        rejectedById: user.id,
        rejectedAt: new Date(),
      },
    });
    return NextResponse.json({ expense: updated });
  }

  if (action === "disburse") {
    if (!hasRole(user, "Cashier")) {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }
    if (expense.locationId !== user.locationId) {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }
    if (expense.status !== "APPROVED") {
      return NextResponse.json(
        { message: "Only approved expenses can be disbursed." },
        { status: 400 }
      );
    }
    if (expense.disbursedAt) {
      return NextResponse.json(
        { message: "Expense already disbursed." },
        { status: 400 }
      );
    }
    const updated = await prisma.expenseSheet.update({
      where: { id: params.id },
      data: {
        status: "DISBURSED",
        disbursedById: user.id,
        disbursedAt: new Date(),
      },
    });
    return NextResponse.json({ expense: updated });
  }

  return NextResponse.json({ message: "Invalid action." }, { status: 400 });
}
