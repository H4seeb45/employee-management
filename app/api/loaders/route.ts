import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole, isAdminUser } from "@/lib/auth";
import { startOfDay } from "date-fns";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");
  const queryLocationId = searchParams.get("locationId");
  
  if (!dateStr) {
    return NextResponse.json({ message: "Date is required" }, { status: 400 });
  }

  // Segment by location
  const locationId = isAdminUser(user) && queryLocationId ? queryLocationId : user.locationId;

  // Handle date normalizing to UTC start of day
  const date = startOfDay(new Date(dateStr));

  try {
    const loaderEntries = await prisma.loaderEntry.findMany({
      where: { 
        date: {
          gte: date,
          lt: new Date(date.getTime() + 24 * 60 * 60 * 1000)
        },
        locationId
      },
      orderBy: { createdAt: "asc" },
      include: {
        vehicle: true
      }
    });

    const summary = await prisma.loaderDailySummary.findUnique({
      where: { 
        date_locationId: {
          date,
          locationId
        }
      },
    });

    return NextResponse.json({ loaderEntries, summary });
  } catch (error) {
    console.error("Error fetching loaders:", error);
    return NextResponse.json({ message: "Error fetching loaders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (!isAdminUser(user) && !hasRole(user, "Storekeeper")) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { date: dateStr, loaderEntries, summary, locationId: reqLocationId } = body;

    if (!dateStr) {
      return NextResponse.json({ message: "Date is required" }, { status: 400 });
    }

    const locationId = isAdminUser(user) && reqLocationId ? reqLocationId : user.locationId;
    const date = startOfDay(new Date(dateStr));
    const today = startOfDay(new Date());

    if (date < today) {
      return NextResponse.json({ message: "Cannot edit or add records for previous dates." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // Clear existing entries for this date and location
      await tx.loaderEntry.deleteMany({
        where: { 
          date: {
            gte: date,
            lt: new Date(date.getTime() + 24 * 60 * 60 * 1000)
          },
          locationId
        },
      });

      // Create new entries
      if (loaderEntries && Array.isArray(loaderEntries)) {
        // Filter out empty entries if any
        const validEntries = loaderEntries.filter((e: any) => e.vehicleId || e.vehicleNo);
        if (validEntries.length > 0) {
          await tx.loaderEntry.createMany({
            data: validEntries.map((entry: any) => ({
              date,
              locationId,
              vehicleId: entry.vehicleId || null,
              vehicleNo: entry.vehicleNo || null,
              loads: parseInt(entry.loads) || 0,
              loaders: parseInt(entry.loaders) || 0,
            })),
          });
        }
      }

      // Update summary
      if (summary) {
        await tx.loaderDailySummary.upsert({
          where: { 
            date_locationId: {
              date,
              locationId
            }
          },
          update: {
            warehouseLoaders: parseInt(summary.warehouseLoaders) || 0,
            dailyWages: parseFloat(summary.dailyWages) || 0,
            netAttendance: parseFloat(summary.netAttendance) || 0,
          },
          create: {
            date,
            locationId,
            warehouseLoaders: parseInt(summary.warehouseLoaders) || 0,
            dailyWages: parseFloat(summary.dailyWages) || 0,
            netAttendance: parseFloat(summary.netAttendance) || 0,
          },
        });
      }
    });

    return NextResponse.json({ message: "Loaders updated successfully" });
  } catch (error) {
    console.error("Error updating loaders:", error);
    return NextResponse.json({ message: "Error updating loaders" }, { status: 500 });
  }
}
