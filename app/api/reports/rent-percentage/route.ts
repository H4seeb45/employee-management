import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser, isSuperAdminUser, hasRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAccountant = hasRole(user, "Accountant");
    const isAdmin = isAdminUser(user);
    const canSeeAll = isAdmin || isAccountant;

    const { searchParams } = new URL(request.url);
    const locationId = canSeeAll ? searchParams.get("locationId") : user.locationId;
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    if (!fromDate || !toDate) {
      return NextResponse.json({ error: "Date range is required" }, { status: 400 });
    }

    const rentTypes = ["VEHICLE_HIRED", "Vehicle Rent - GT", "Vehicle Rent - WS", "VAN_RENT_EXPENSES"];

    const where: any = {
      status: "DISBURSED", // Only count disbursed expenses for this report
      expenseType: {
        expenseCode: { in: rentTypes }
      },
      createdAt: {
        gte: new Date(fromDate + "T00:00:00Z"),
        lte: new Date(toDate + "T23:59:59Z")
      }
    };

    if (locationId && locationId !== "all") {
      where.locationId = locationId;
    }

    const expenses = await prisma.expenseSheet.findMany({
      where,
      select: {
        amount: true,
        invoiceAmount: true,
        returnAmount: true,
        locationId: true,
        location: {
          select: { name: true, city: true }
        }
      }
    });

    // Group by location or just sum everything?
    // If locationId is provided, we return one consolidated record.
    // If "all", we might want to return per location.

    if (locationId && locationId !== "all") {
      const totals = expenses.reduce((acc, curr) => {
        acc.rentAmount += curr.amount || 0;
        acc.invoiceAmount += curr.invoiceAmount || 0;
        acc.returnAmount += curr.returnAmount || 0;
        return acc;
      }, { rentAmount: 0, invoiceAmount: 0, returnAmount: 0 });

      const returnPercent = totals.invoiceAmount > 0 ? (totals.returnAmount / totals.invoiceAmount) * 100 : 0;
      const rentPercent = totals.invoiceAmount > 0 ? (totals.rentAmount / totals.invoiceAmount) * 100 : 0;

      return NextResponse.json({
        report: [{
          locationId,
          locationName: expenses[0]?.location ? `${expenses[0].location.name} (${expenses[0].location.city})` : "Selected Office",
          ...totals,
          returnPercent,
          rentPercent
        }]
      });
    }

    // Default: Group by location
    const grouped: Record<string, any> = {};
    expenses.forEach(curr => {
      if (!grouped[curr.locationId]) {
        grouped[curr.locationId] = {
          locationId: curr.locationId,
          locationName: `${curr.location.name} (${curr.location.city})`,
          rentAmount: 0,
          invoiceAmount: 0,
          returnAmount: 0
        };
      }
      grouped[curr.locationId].rentAmount += curr.amount || 0;
      grouped[curr.locationId].invoiceAmount += curr.invoiceAmount || 0;
      grouped[curr.locationId].returnAmount += curr.returnAmount || 0;
    });

    const report = Object.values(grouped).map(loc => {
      loc.returnPercent = loc.invoiceAmount > 0 ? (loc.returnAmount / loc.invoiceAmount) * 100 : 0;
      loc.rentPercent = loc.invoiceAmount > 0 ? (loc.rentAmount / loc.invoiceAmount) * 100 : 0;
      return loc;
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to generate rent report" }, { status: 500 });
  }
}
