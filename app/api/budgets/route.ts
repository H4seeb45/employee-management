import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole, isAdminUser, isSuperAdminUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const isAdmin = isAdminUser(user);
  const isSuperAdmin = isSuperAdminUser(user);
  const isBM = hasRole(user, "Business Manager");

  if (!isAdmin && !isBM) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  // Super Admin can see budgets for any location, Admin/BM see their own location's budget
  const locationId = isSuperAdmin ? searchParams.get("locationId") : user.locationId;

  const where: any = locationId ? { locationId } : {};

  // If Super Admin doesn't provide locationId, show all budgets
  const budgets = await prisma.budget.findMany({
    where,
    include: {
      location: true,
      createdBy: {
        select: {
          id: true,
          email: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          email: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ budgets });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const isBM = hasRole(user, "Business Manager");
  if (!isBM) {
    return NextResponse.json({ message: "Only Business Managers can set budget." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const amount = Number.parseFloat(body?.amount);

  if (Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ message: "A valid positive amount is required." }, { status: 400 });
  }

  // Check if budget already exists for this location
  const existingBudget = await prisma.budget.findUnique({
    where: { locationId: user.locationId },
  });

  if (existingBudget) {
    if (existingBudget.status === "APPROVED") {
      return NextResponse.json({ message: "Approved budget cannot be modified." }, { status: 400 });
    }

    const updated = await prisma.budget.update({
      where: { id: existingBudget.id },
      data: {
        amount,
        status: "PENDING",
        createdById: user.id,
      },
    });
    return NextResponse.json({ budget: updated });
  }

  const budget = await prisma.budget.create({
    data: {
      amount,
      locationId: user.locationId,
      createdById: user.id,
    },
  });

  return NextResponse.json({ budget });
}
