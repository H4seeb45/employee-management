import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  hasRole,
  isAdminUser,
  isSuperAdminUser,
} from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = isAdminUser(user);
    const isSuperAdmin = isSuperAdminUser(user);
    const isBusinessManager = hasRole(user, "Business Manager");
    const { searchParams } = new URL(request.url);

    const locationId = searchParams.get("locationId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const employeeId = searchParams.get("employeeId");

    let where: any = {};

    if (!isAdmin && !isBusinessManager && !isSuperAdmin) {
      const employee = await prisma.employee.findUnique({
        where: { userId: user.id },
      });
      if (!employee) {
        return NextResponse.json(
          { error: "Employee record not found" },
          { status: 404 },
        );
      }
      where.employeeId = employee.id;
    } else {
      if (locationId && locationId !== "all") {
        where.employee = { locationId };
      }
    }

    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      const startOfMonth = new Date(y, m - 1, 1);
      const endOfMonth = new Date(y, m, 0, 23, 59, 59);

      where.createdAt = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    const requests = await prisma.adminRequest.findMany({
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
      { error: "Failed to fetch admin requests" },
      { status: 500 },
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
    const isBusinessManager = hasRole(user, "Business Manager");
    const isSuperAdmin = isSuperAdminUser(user);
    const body = await req.json();

    let employeeId: string | undefined = body.employeeId;

    if (!isAdmin && !isBusinessManager && !isSuperAdmin) {
      const employee = await prisma.employee.findUnique({
        where: { userId: user.id },
        select: { id: true, employeeName: true },
      });
      if (!employee) {
        return NextResponse.json(
          { error: "Employee record not found" },
          { status: 404 },
        );
      }
      employeeId = employee.id;
      body.employeeName = employee.employeeName;

      // Constraint: only one pending request per month per employee
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
      );

      const pendingRequest = await prisma.adminRequest.findFirst({
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
          { error: "You already have a pending admin request for this month." },
          { status: 400 },
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
        { error: "Missing employee information" },
        { status: 400 },
      );
    }

    if (!body.subject || !body.details) {
      return NextResponse.json(
        { error: "Subject and Details are required" },
        { status: 400 },
      );
    }

    const data: any = {
      employeeId,
      employeeName: body.employeeName ?? null,
      subject: body.subject,
      details: body.details,
      status: isAdmin ? (body.status ?? "PENDING") : "PENDING",
    };

    const created = await prisma.adminRequest.create({ data });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create admin request" },
      { status: 500 },
    );
  }
}
