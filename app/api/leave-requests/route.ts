import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser, hasRole, isSuperAdminUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = isAdminUser(user);
    const { searchParams } = new URL(request.url);

    const locationId = searchParams.get("locationId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const employeeId = searchParams.get("employeeId");

    let where: any = {};
    const isBusinessManager = hasRole(user, "Business Manager");
    const isSuperAdmin = isSuperAdminUser(user);
    if (!isAdmin && !isBusinessManager && !isSuperAdmin) {
      const employee = await prisma.employee.findUnique({
        where: { userId: user.id },
      });
      if (!employee) {
        return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
      }
      where.employeeId = employee.id;
    } else {
      if (locationId) {
        where.employee = { locationId };
      } else if (!isSuperAdmin) {
        where.employee = { locationId: user.locationId };
      }
      if (employeeId) {
        where.employeeId = employeeId;
      }
    }

    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      const startOfMonth = new Date(y, m - 1, 1);
      const endOfMonth = new Date(y, m, 0, 23, 59, 59);

      where.startDate = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          include: {
            location: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(requests);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch leave requests" },
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

    const parseDate = (val: any) => {
      if (val === null || val === undefined || val === "") return null;
      if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
      const parsed = new Date(val);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    let employeeId: string | undefined = body.employeeId ?? body.employee_id ?? undefined;
    const isBusinessManager = hasRole(user, "Business Manager");
    const isSuperAdmin = isSuperAdminUser(user);
    
    if (!isAdmin && !isBusinessManager && !isSuperAdmin) {
      const employee = await prisma.employee.findUnique({
        where: { userId: user.id },
        select: { id: true, employeeName: true },
      });
      if (!employee) {
        return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
      }
      employeeId = employee.id;
      body.employeeName = employee.employeeName;

      // Constraint: employees can submit leaves again only if there aren't any pending requests in current month.
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const pendingRequest = await prisma.leaveRequest.findFirst({
        where: {
          employeeId,
          status: "PENDING",
          createdAt: {
            gte: firstDay,
            lte: lastDay,
          },
        },
      });

      if (pendingRequest) {
        return NextResponse.json(
          { error: "You already have a pending leave request for this month." },
          { status: 400 }
        );
      }
    }

    if (!employeeId && body.employeeName) {
      const found = await prisma.employee.findFirst({
        where: { employeeName: body.employeeName },
        select: { id: true },
      });
      if (found) employeeId = found.id;
    }

    if (!employeeId) {
      return NextResponse.json(
        { error: "Missing or unknown employeeId for leave request" },
        { status: 400 }
      );
    }

    const data: any = {
      employeeId,
      employeeName: body.employeeName ?? null,
      leaveType: body.leaveType ?? null,
      startDate: parseDate(body.startDate),
      endDate: parseDate(body.endDate),
      days: body.days ? parseInt(body.days.toString()) : null,
      reason: body.reason ?? null,
      status: isAdmin ? (body.status ?? "PENDING") : "PENDING",
    };

    const created = await prisma.leaveRequest.create({ data });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create leave request" },
      { status: 500 }
    );
  }
}
