import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const list = await prisma.payroll.findMany({ include: { employee: true } });
    return NextResponse.json(list);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch payrolls" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
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

    const data: any = {
      employeeId,
      amount:
        typeof body.amount === "number"
          ? body.amount
          : parseFloat(body.amount) || 0,
      periodStart: parseDate(body.periodStart),
      periodEnd: parseDate(body.periodEnd),
      paidAt: parseDate(body.paidAt),
      paymentMethod: body.paymentMethod ?? null,
      status: body.status ?? null,
      notes: body.notes ?? null,
    };

    const created = await prisma.payroll.create({ data });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create payroll" },
      { status: 500 }
    );
  }
}
