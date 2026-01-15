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

  if (!isCashier && !isBM && !isAdminUser(user)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const isSuperAdmin = isSuperAdminUser(user);
  const locationId = isSuperAdmin ? searchParams.get("locationId") : null;
  const where = isSuperAdmin
    ? locationId
      ? { locationId }
      : {}
    : { locationId: user.locationId };

  const [statusRows, typeRows] = await Promise.all([
    prisma.expenseSheet.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    prisma.expenseSheet.groupBy({
      by: ["expenseType"],
      where,
      _sum: { amount: true },
    }),
  ]);

  const statusCounts = statusRows.reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    },
    {}
  );

  const typeTotals = typeRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.expenseType] = row._sum.amount ?? 0;
    return acc;
  }, {});

  return NextResponse.json({ statusCounts, typeTotals });
}
