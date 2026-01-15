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
    const attendance = await prisma.attendance.findMany({
      where: isAdmin
        ? locationId
          ? { employee: { locationId } }
          : undefined
        : { employee: { locationId: user.locationId } },
    });
    return NextResponse.json(attendance);
  } catch (error) {
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
