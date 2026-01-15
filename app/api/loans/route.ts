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
    const list = await prisma.loan.findMany({
      include: { employee: true },
      where: isAdmin
        ? locationId
          ? { employee: { locationId } }
          : undefined
        : { employee: { locationId: user.locationId } },
    });
    return NextResponse.json(list);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch loans" },
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
      employeeId,
      principalAmount:
        typeof body.principalAmount === "number"
          ? body.principalAmount
          : parseFloat(body.principalAmount) || 0,
      issuedAt: parseDate(body.issuedAt),
      dueAt: parseDate(body.dueAt),
      balance:
        typeof body.balance === "number"
          ? body.balance
          : parseFloat(body.balance) || 0,
      installments: body.installments ?? null,
      monthlyInstallment:
        typeof body.monthlyInstallment === "number"
          ? body.monthlyInstallment
          : parseFloat(body.monthlyInstallment) || null,
      status: body.status ?? null,
      notes: body.notes ?? null,
    };

    const created = await prisma.loan.create({ data });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create loan" },
      { status: 500 }
    );
  }
}
