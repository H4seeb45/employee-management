import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser, isSuperAdminUser, hasRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const isAccountant = hasRole(user, "Accountant");
  const isBM = hasRole(user, "Business Manager");
  if (!isBM && !isAccountant && !isAdminUser(user)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const isAdmin = isAdminUser(user);
  const locationId = (isAdmin || isAccountant) ? searchParams.get("locationId") : user.locationId;

  const locConditions: any[] = [];
  if (locationId && locationId !== "all") {
    locConditions.push({ locationId });
  }
  const where = locConditions.length > 0 ? { OR: locConditions } : {};

  const now = new Date();
  const selectedMonth = searchParams.get("month") ? parseInt(searchParams.get("month")!) : now.getMonth() + 1;
  const selectedYear = searchParams.get("year") ? parseInt(searchParams.get("year")!) : now.getFullYear();

  let daysToReport = new Date(selectedYear, selectedMonth, 0).getDate();
  if (selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1) {
    daysToReport = now.getDate();
  }

  const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
  const endOfMonth = new Date(selectedYear, selectedMonth, 1);

  let lastMonth = selectedMonth - 1;
  let lastMonthYear = selectedYear;
  if (lastMonth === 0) {
    lastMonth = 12;
    lastMonthYear--;
  }

  try {
    const expenseTypes = await prisma.expenseType.findMany({
      where: { ...where, isActive: true },
      orderBy: { name: 'asc' }
    });

    const lastBudgetsRaw = await prisma.budget.findMany({
      where: { ...where, month: lastMonth, year: lastMonthYear }
    });
    
    const currentBudgetsRaw = await prisma.budget.findMany({
      where: { ...where, month: selectedMonth, year: selectedYear }
    });

// const diagnostics = await prisma.expenseSheet.findMany({
//     where: { locationId: 'cmkef6vzv0005f4ubsuvc9vmq' },
//     select: {
//         status: true,
//         createdAt: true
//     }
// });

// console.log('Actual Data in DB:', diagnostics);
// console.log("startOfMonth",startOfMonth);
// console.log("endOfMonth",endOfMonth);
// console.log("locationId",locationId);
// console.log("where",where);
    const currentExpensesRaw = await prisma.expenseSheet.findMany({
        where: {
            locationId: locationId as string,
            createdAt: { gte: startOfMonth, lt: endOfMonth },
            status: "DISBURSED",
        },
        include: { expenseType: true },
    });

    let lastMonthLimits: Record<string, number> = {};
    lastBudgetsRaw.forEach(b => {
      const cats = (b.categories as Record<string, number>) || {};
      Object.entries(cats).forEach(([code, limit]) => {
        lastMonthLimits[code] = (lastMonthLimits[code] || 0) + limit;
      });
    });

    let currentMonthLimits: Record<string, number> = {};
    currentBudgetsRaw.forEach(b => {
      const cats = (b.categories as Record<string, number>) || {};
      Object.entries(cats).forEach(([code, limit]) => {
        currentMonthLimits[code] = (currentMonthLimits[code] || 0) + limit;
      });
    });

    let mtdSpent: Record<string, number> = {};
    let dailySpent: Record<string, Record<number, number>> = {};
    
    currentExpensesRaw.forEach(e => {
        const code = e.expenseType?.expenseCode || (e as any).expenseTypeEnum || "UNKNOWN";
        const amount = e.amount;
        
        mtdSpent[code] = (mtdSpent[code] || 0) + amount;
        
        const day = new Date(e.createdAt).getDate();
        if (!dailySpent[code]) dailySpent[code] = {};
        dailySpent[code][day] = (dailySpent[code][day] || 0) + amount;
    });

    const allCodes = new Set<string>();
    
    Object.keys(lastMonthLimits).forEach(id => allCodes.add(id));
    Object.keys(currentMonthLimits).forEach(id => allCodes.add(id));
    Object.keys(mtdSpent).forEach(code => allCodes.add(code));
    expenseTypes.forEach(et => {
        allCodes.add(et.id);
        if (et.expenseCode) allCodes.add(et.expenseCode);
    });

    const codeToName = new Map<string, string>();

    // Map from DB expense types
    expenseTypes.forEach(et => {
        // Map both ID and Code to the Name to catch both Budget limit keys and Expense code keys
        if (et.expenseCode) {
            codeToName.set(et.expenseCode, et.name.trim());
        }
        codeToName.set(et.id, et.name.trim());
    });

    const aggregatedReport = new Map<string, any>();

    allCodes.forEach(code => {
        const nameKey = codeToName.get(code) || code;

        if (!aggregatedReport.has(nameKey)) {
            aggregatedReport.set(nameKey, {
                id: code,
                name: nameKey,
                code: code,
                lastMonthBudget: 0,
                currentMonthBudget: 0,
                mtdSpent: 0,
                dailyExpenses: {}
            });
        }
        
        const r = aggregatedReport.get(nameKey)!;
        r.lastMonthBudget += (lastMonthLimits[code] || 0);
        r.currentMonthBudget += (currentMonthLimits[code] || 0);
        r.mtdSpent += (mtdSpent[code] || 0);
        
        const daySpends = dailySpent[code] || {};
        Object.entries(daySpends).forEach(([dayStr, amount]) => {
            const d = parseInt(dayStr);
            r.dailyExpenses[d] = (r.dailyExpenses[d] || 0) + (amount as number);
        });
    });

    let report = Array.from(aggregatedReport.values());

    return NextResponse.json({
        report,
        daysToReport,
        monthAbbr: startOfMonth.toLocaleString('en-US', { month: 'short' }),
        year: selectedYear
    });
  } catch(error) {
    console.error("Budget MTD Error: ", error);
    return NextResponse.json({ error: "Failed to generate MTD report." }, { status: 500 });
  }
}
