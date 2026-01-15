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
    const locationId = isSuperAdmin ? searchParams.get("locationId") : null;
    const requests = await prisma.leaveRequest.findMany({
      where: isAdmin
        ? locationId
          ? { employee: { locationId } }
          : undefined
        : { employee: { locationId: user.locationId } },
    });
    return NextResponse.json(requests);
  } catch (error) {
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

    // Resolve employeeId: prefer explicit employeeId, else try to find by employeeName
    let employeeId: string | undefined =
      body.employeeId ?? body.employee_id ?? undefined;
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
    if (!isAdmin) {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { locationId: true },
      });
      if (!employee || employee.locationId !== user.locationId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const data: any = {
      id: body.id ?? undefined,
      employeeId,
      employeeName: body.employeeName ?? null,
      leaveType: body.leaveType ?? null,
      startDate: parseDate(body.startDate),
      endDate: parseDate(body.endDate),
      days: body.days ?? null,
      reason: body.reason ?? null,
      status: body.status ?? null,
    };

    const created = await prisma.leaveRequest.create({ data });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to create leave request" },
      { status: 500 }
    );
  }
}
