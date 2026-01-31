import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  hasRole,
  isAdminUser,
  isSuperAdminUser,
} from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

const getMonthRange = (date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const isSuperAdmin = isSuperAdminUser(user);
  const expense = await prisma.expenseSheet.findUnique({
    where: { id },
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
  if (!isSuperAdmin && expense.locationId !== user.locationId && !hasRole(user, "Accountant")) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json({ expense });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action?.toString();

  const expense = await prisma.expenseSheet.findUnique({
    where: { id },
  });
  if (!expense) {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }

  if (action === "approve") {
    if (!isAdminUser(user) && !isSuperAdminUser(user)) {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }
    if (expense.status !== "PENDING") {
      return NextResponse.json(
        { message: "Only pending expenses can be approved." },
        { status: 400 }
      );
    }

    // Budget check upon approval
    const budget = await prisma.budget.findUnique({
      where: { locationId: expense.locationId },
    });

    if (!budget || budget.status !== "APPROVED") {
      return NextResponse.json(
        { message: "No approved budget found for this location. Cannot approve expenses." },
        { status: 400 }
      );
    }

    const { start, end } = getMonthRange();
    const totalThisMonth = await prisma.expenseSheet.aggregate({
      where: {
        locationId: expense.locationId,
        createdAt: { gte: start, lt: end },
        status: "APPROVED", // Only count already approved ones
        id: { not: expense.id }
      },
      _sum: { amount: true },
    });

    const used = totalThisMonth._sum.amount ?? 0;
    if (used + expense.amount > budget.amount) {
      return NextResponse.json(
        { message: "Insufficient budget to approve this expense." },
        { status: 400 }
      );
    }

    const updated = await prisma.expenseSheet.update({
      where: { id },
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
    if (!isAdminUser(user) && !isSuperAdminUser(user)) {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }
    if (expense.status !== "PENDING") {
      return NextResponse.json(
        { message: "Only pending expenses can be rejected." },
        { status: 400 }
      );
    }
    const updated = await prisma.expenseSheet.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectedById: user.id,
        rejectedAt: new Date(),
      },
    });
    return NextResponse.json({ expense: updated });
  }

  if (action === "disburse") {
    // if (!hasRole(user, "Cashier") && ) {
    //   return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    // }
    if (!hasRole(user, "Cashier") && !hasRole(user, "Accountant") && !isSuperAdminUser(user) && expense.locationId !== user.locationId ) {
      console.log("Forbidden.")
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }
    
    if(hasRole(user, "Cashier") && expense.disburseType !== "Cash") {
      console.log("Only Cash expenses can be disbursed.")
      return NextResponse.json({ message: "Only Cash expenses can be disbursed." }, { status: 400 });
    }

    if(hasRole(user, "Accountant") && expense.disburseType !== "Cheque / Online Transfer") {
      console.log("Only Cheque / Online Transfer expenses can be disbursed.")
      return NextResponse.json({ message: "Only Cheque / Online Transfer expenses can be disbursed." }, { status: 400 });
    }

    if (expense.status !== "APPROVED") {
      console.log("Only approved expenses can be disbursed.")
      return NextResponse.json(
        { message: "Only approved expenses can be disbursed." },
        { status: 400 }
      );
    }
    if (expense.disbursedAt) {
      console.log("Expense already disbursed.")
      return NextResponse.json(
        { message: "Expense already disbursed." },
        { status: 400 }
      );
    }

    const disburseData: any = {
      status: "DISBURSED",
      disbursedById: user.id,
      disbursedAt: new Date(),
    };

    if (expense.disburseType === "Cheque / Online Transfer") {
      const accountTitle = body?.accountTitle?.toString();
      const accountNo = body?.accountNo?.toString();
      const bankName = body?.bankName?.toString();
      const chequeDate = body?.chequeDate ? new Date(body.chequeDate) : null;
      const disbursedAmount = Number.parseFloat(body?.disbursedAmount);

      if (!accountTitle || !accountNo || !bankName || !chequeDate || Number.isNaN(disbursedAmount)) {
        return NextResponse.json(
          { message: "All cheque/online disbursement details are required." },
          { status: 400 }
        );
      }

      disburseData.accountTitle = accountTitle;
      disburseData.accountNo = accountNo;
      disburseData.bankName = bankName;
      disburseData.chequeDate = chequeDate;
      disburseData.disbursedAmount = disbursedAmount;
    }

    const updated = await prisma.expenseSheet.update({
      where: { id },
      data: disburseData,
    });
    return NextResponse.json({ expense: updated });
  }

  if (action === "updateDisburseType") {
    const newType = body?.disburseType?.toString();
    if (!newType) {
      return NextResponse.json({ message: "Disburse type is required." }, { status: 400 });
    }

    // Role-specific restrictions
    const isAccountant = hasRole(user, "Accountant");
    const isCashier = hasRole(user, "Cashier");

    if (!isSuperAdminUser(user)) {
      if(newType === "Cash" && !isAccountant){
        console.log("Only Accountants or Super Admins can reassign to Cash.")
        return NextResponse.json({ message: "Only Accountants or Super Admins can reassign to Cash." }, { status: 403 });
      }
      if(newType === "Cheque / Online Transfer" && !isCashier){
        console.log("Only Cashiers or Super Admins can reassign to Cheque.")
        return NextResponse.json({ message: "Only Cashiers or Super Admins can reassign to Cheque." }, { status: 403 });
      }
    }

    const updated = await prisma.expenseSheet.update({
      where: { id },
      data: { disburseType: newType },
    });
    return NextResponse.json({ expense: updated });
  }

  return NextResponse.json({ message: "Invalid action." }, { status: 400 });
}
