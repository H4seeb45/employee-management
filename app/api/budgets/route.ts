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
  const locationId = isSuperAdmin ? searchParams.get("locationId") : user.locationId;
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;

  const where: any = locationId ? { locationId } : {};
  if (month) where.month = month;
  if (year) where.year = year;

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
    orderBy: [
      { year: "desc" },
      { month: "desc" },
      { updatedAt: "desc" }
    ],
  });

  return NextResponse.json({ budgets });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const isAdmin = isAdminUser(user);
  const isBM = hasRole(user, "Business Manager");
  if (!isBM && !isAdmin) {
    return NextResponse.json({ message: "Only Business Managers or Admins can set budget." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const rawCategories = body?.categories || {};
  const month = body?.month ? parseInt(body.month) : new Date().getMonth() + 1;
  const year = body?.year ? parseInt(body.year) : new Date().getFullYear();
  
  // Clean and convert categories to numbers, filtering out zero/invalid values
  const categories: Record<string, number> = {};
  Object.entries(rawCategories).forEach(([key, val]) => {
    const numVal = Number(val);
    if (!isNaN(numVal) && numVal > 0) {
      categories[key] = numVal;
    }
  });
  
  // Calculate total amount from cleaned categories
  const amount = Object.values(categories).reduce((sum: number, val: number) => sum + val, 0);

  if (amount <= 0) {
    return NextResponse.json({ message: "A valid positive budget is required across categories." }, { status: 400 });
  }

  // Check if budget already exists for this location and month
  const existingBudget = await prisma.budget.findFirst({
    where: { 
      locationId: user.locationId,
      month,
      year
    },
  });

  if (existingBudget) {
    if (existingBudget.status === "APPROVED" && !isAdmin) {
      return NextResponse.json({ message: "Approved budget cannot be modified." }, { status: 400 });
    }

    const updated = await prisma.budget.update({
      where: { id: existingBudget.id },
      data: {
        amount,
        categories,
        status: isAdmin ? "APPROVED" : "PENDING",
        createdById: user.id,
        ...(isAdmin ? { approvedById: user.id } : {}),
      },
    });
    return NextResponse.json({ budget: updated });
  }

  const budget = await prisma.budget.create({
    data: {
      amount,
      categories,
      month,
      year,
      locationId: user.locationId,
      createdById: user.id,
      status: isAdmin ? "APPROVED" : "PENDING",
      ...(isAdmin ? { approvedById: user.id } : {}),
    },
  });

  return NextResponse.json({ budget });
}

