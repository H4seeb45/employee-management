import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser, isSuperAdminUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = isAdminUser(user);
    const isSuperAdmin = isSuperAdminUser(user);
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const day = searchParams.get("day");
    const status = searchParams.get("status");

    const where: any = {};

    // Status filtering
    if (status && status !== "all") {
      where.status = status;
    }

    // Location filtering
    if (isAdmin || isSuperAdmin) {
      if (locationId && locationId !== "all") {
        where.employee = { locationId };
      }
    } else {
      where.employee = { locationId: user.locationId };
    }

    // Month/Year/Day filtering
    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      
      if (day && day !== "all") {
        const d = parseInt(day);
        const startDate = new Date(y, m - 1, d, 0, 0, 0, 0);
        const endDate = new Date(y, m - 1, d, 23, 59, 59, 999);
        where.date = {
          gte: startDate,
          lte: endDate,
        };
      } else {
        const startDate = new Date(y, m - 1, 1);
        const endDate = new Date(y, m, 0, 23, 59, 59, 999);
        where.date = {
          gte: startDate,
          lte: endDate,
        };
      }
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            employeeId: true,
            employeeName: true,
            position: true,
            department: true,
          }
        }
      },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(attendance);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = isAdminUser(user);
    const body = await req.json();
    if (!isAdmin) {
      const employeeId = body.employeeId ?? body.employee_id ?? undefined;
      if (!employeeId) {
        return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });
      }
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { locationId: true },
      });
      if (!employee || employee.locationId !== user.locationId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    const created = await prisma.attendance.create({ data: body });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to create attendance" },
      { status: 500 }
    );
  }
}
