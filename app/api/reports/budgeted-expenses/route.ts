import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole, isAdminUser } from "@/lib/auth";

type ReportRow = {
  locationId: string;
  locationName: string;
  city: string;
  budgeted: number;
  expenses: number;
  balance: number;
};

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const isAccountant = hasRole(user, "Accountant");
  const isBM = hasRole(user, "Business Manager");
  if (!isBM && !isAccountant && !isAdminUser(user)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const selectedMonth = searchParams.get("month")
    ? Number.parseInt(searchParams.get("month")!, 10)
    : now.getMonth() + 1;
  const selectedYear = searchParams.get("year")
    ? Number.parseInt(searchParams.get("year")!, 10)
    : now.getFullYear();

  if (!selectedMonth || selectedMonth < 1 || selectedMonth > 12 || !selectedYear) {
    return NextResponse.json({ message: "Invalid report month." }, { status: 400 });
  }

  const canViewAllLocations = isAdminUser(user) || isAccountant;
  const requestedLocationIds = (searchParams.get("locationIds") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const locationWhere = canViewAllLocations
    ? requestedLocationIds.length > 0
      ? { id: { in: requestedLocationIds } }
      : {}
    : { id: user.locationId };

  const locations = await prisma.location.findMany({
    where: locationWhere,
    orderBy: [{ city: "asc" }, { name: "asc" }],
  });

  const locationIds = locations.map((location) => location.id);
  if (locationIds.length === 0) {
    return NextResponse.json({
      report: [],
      totals: { budgeted: 0, expenses: 0, balance: 0 },
      month: selectedMonth,
      year: selectedYear,
    });
  }

  const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
  const endOfMonth = new Date(selectedYear, selectedMonth, 1);
  const locationFilter = { locationId: { in: locationIds } };

  const [budgets, expenses] = await Promise.all([
    prisma.budget.findMany({
      where: {
        ...locationFilter,
        month: selectedMonth,
        year: selectedYear,
      },
      select: {
        amount: true,
        locationId: true,
      },
    }),
    prisma.expenseSheet.findMany({
      where: {
        ...locationFilter,
        createdAt: { gte: startOfMonth, lt: endOfMonth },
        status: { in: ["APPROVED", "DISBURSED"] },
      },
      select: {
        amount: true,
        locationId: true,
      },
    }),
  ]);

  const budgetsByLocation = new Map<string, number>();
  budgets.forEach((budget) => {
    budgetsByLocation.set(
      budget.locationId,
      (budgetsByLocation.get(budget.locationId) || 0) + budget.amount,
    );
  });

  const expensesByLocation = new Map<string, number>();
  expenses.forEach((expense) => {
    expensesByLocation.set(
      expense.locationId,
      (expensesByLocation.get(expense.locationId) || 0) + expense.amount,
    );
  });

  const report: ReportRow[] = locations.map((location) => {
    const budgeted = budgetsByLocation.get(location.id) || 0;
    const expenseTotal = expensesByLocation.get(location.id) || 0;

    return {
      locationId: location.id,
      locationName: location.name,
      city: location.city,
      budgeted,
      expenses: expenseTotal,
      balance: budgeted - expenseTotal,
    };
  });

  const totals = report.reduce(
    (acc, row) => {
      acc.budgeted += row.budgeted;
      acc.expenses += row.expenses;
      acc.balance += row.balance;
      return acc;
    },
    { budgeted: 0, expenses: 0, balance: 0 },
  );

  return NextResponse.json({
    report,
    totals,
    month: selectedMonth,
    year: selectedYear,
  });
}
