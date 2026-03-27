import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser, isSuperAdminUser } from "@/lib/auth";
import { differenceInMonths } from "date-fns";

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
    let whereClause: any = {};
    const employeeRecord = await prisma.employee.findUnique({ where: { userId: user.id } });
    const isBM = user.roles?.some((ur: any) => ur.role.name === "Business Manager");
    const authorizedIds = [
      user.locationId,
      ...(user.authorizedLocations?.map((l: any) => l.id) || []),
    ].filter(Boolean);

    if (isSuperAdmin) {
      if (locationId) {
        whereClause = { employee: { locationId } };
      }
    } else if (isBM || isAdmin) {
      whereClause = { employee: { locationId: { in: authorizedIds } } };
    } else if (employeeRecord) {
      whereClause = { employeeId: employeeRecord.id };
    } else {
      whereClause = { employee: { locationId: user.locationId } };
    }

    const list = await prisma.advance.findMany({
      include: { employee: true },
      where: whereClause,
      orderBy: { issuedAt: "desc" }
    });
    return NextResponse.json(list);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch advances" },
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

    const parseDate = (v: any) => {
      if (!v && v !== 0) return null;
      const d = v instanceof Date ? v : new Date(v);
      return isNaN(d.getTime()) ? null : d;
    };

    const employeeId = body.employeeId ?? body.employee_id ?? undefined;
    if (!employeeId)
      return NextResponse.json(
        { error: "Missing employeeId" },
        { status: 400 }
      );
      
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { locationId: true, joinDate: true, basicSalary: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const employeeRecord = await prisma.employee.findUnique({ where: { userId: user.id } });

    // Allow employees to create for themselves, otherwise must have right location access
    if (!isAdmin) {
      if (employeeRecord && employeeId !== employeeRecord.id) {
         return NextResponse.json({ error: "You can only request advances for yourself." }, { status: 403 });
      } else if (!employeeRecord && employee.locationId !== user.locationId) {
         return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const principalAmount = typeof body.principalAmount === "number"
      ? body.principalAmount
      : parseFloat(body.principalAmount) || 0;

    // Rule 1: Advance for an employee can be applied after three months of joining date.
    if (!employee.joinDate) {
      return NextResponse.json({ error: "Employee join date is not set" }, { status: 400 });
    }
    const monthsSinceJoin = differenceInMonths(new Date(), new Date(employee.joinDate));
    if (monthsSinceJoin < 3) {
      return NextResponse.json({ error: "Advance can only be applied after three months of joining date." }, { status: 400 });
    }

    // Rule 2: Advance can be max 25% of the basic employee salary.
    if (!employee.basicSalary || employee.basicSalary <= 0) {
      return NextResponse.json({ error: "Employee basic salary data is not available." }, { status: 400 });
    }
    const maxAdvance = employee.basicSalary * 0.25;
    if (principalAmount > maxAdvance) {
      return NextResponse.json({ error: `Requested advance exceeds maximum limit of 25% of basic salary (${maxAdvance}).` }, { status: 400 });
    }

    // Rule 3: Only one advance per month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed
    const startOfMonth = new Date(`${currentYear}-${currentMonth.toString().padStart(2, '0')}-01T00:00:00.000Z`);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    const existingAdvanceThisMonth = await prisma.advance.findFirst({
      where: {
        employeeId,
        status: { not: "Rejected" },
        issuedAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });

    if (existingAdvanceThisMonth) {
      return NextResponse.json({ error: `An employee can only apply for one advance per month.` }, { status: 400 });
    }

    const data: any = {
      employeeId,
      principalAmount,
      issuedAt: parseDate(body.issuedAt),
      dueAt: parseDate(body.dueAt),
      balance:
        typeof body.balance === "number"
          ? body.balance
          : parseFloat(body.balance) || principalAmount,
      installments: body.installments ?? null,
      monthlyInstallment:
        typeof body.monthlyInstallment === "number"
          ? body.monthlyInstallment
          : parseFloat(body.monthlyInstallment) || null,
      status: "Submitted", // Default status for new requests
      notes: body.notes ?? null,
    };

    const created = await prisma.advance.create({ data });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create advance" },
      { status: 500 }
    );
  }
}
