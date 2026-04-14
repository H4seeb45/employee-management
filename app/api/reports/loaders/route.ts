import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fromDateStr = searchParams.get("fromDate");
  const toDateStr = searchParams.get("toDate");
  const queryLocationId = searchParams.get("locationId");

  if (!fromDateStr || !toDateStr) {
    return NextResponse.json({ message: "Date range is required" }, { status: 400 });
  }

  const locationId = isAdminUser(user) && queryLocationId ? queryLocationId : user.locationId;
  const fromDate = startOfDay(new Date(fromDateStr));
  const toDate = endOfDay(new Date(toDateStr));

  try {
    // 1. Fetch LoaderEntries for the range
    const entries = await prisma.loaderEntry.findMany({
      where: {
        date: { gte: fromDate, lte: toDate },
        locationId
      },
      include: { vehicle: true }
    });

    // 2. Fetch LoaderDailySummaries for the range
    const summaries = await prisma.loaderDailySummary.findMany({
      where: {
        date: { gte: fromDate, lte: toDate },
        locationId
      }
    });

    // 3. Aggregate Entries by Vehicle
    const vehicleMap: Record<string, { vehicleNo: string; loads: number; loaders: number }> = {};
    
    entries.forEach(entry => {
      const vNo = entry.vehicleNo || entry.vehicle?.vehicleNo || "Unknown";
      if (!vehicleMap[vNo]) {
        vehicleMap[vNo] = { vehicleNo: vNo, loads: 0, loaders: 0 };
      }
      vehicleMap[vNo].loads += entry.loads;
      vehicleMap[vNo].loaders += entry.loaders;
    });

    // 4. Sum Warehouse Loaders, Daily Wages, etc.
    let totalWarehouseLoaders = 0;
    let totalDailyWages = 0;
    let totalNetAttendance = 0;

    summaries.forEach(summary => {
      totalWarehouseLoaders += summary.warehouseLoaders || 0;
      totalDailyWages += summary.dailyWages || 0;
      totalNetAttendance += summary.netAttendance || 0;
    });

    const vehicleList = Object.values(vehicleMap);
    const totalVehicleLoaders = vehicleList.reduce((sum, v) => sum + v.loaders, 0);
    const grandTotalLoaders = totalVehicleLoaders + totalWarehouseLoaders;

    return NextResponse.json({
      vehicleList,
      warehouseLoaders: totalWarehouseLoaders,
      totalLoaders: grandTotalLoaders,
      dailyWages: totalDailyWages,
      netAttendance: totalNetAttendance
    });
  } catch (error) {
    console.error("Error generating loaders report:", error);
    return NextResponse.json({ message: "Error generating report" }, { status: 500 });
  }
}
