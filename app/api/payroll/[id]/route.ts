import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: any }) {
  const { id } = (await params) as { id: string };
  try {
    const item = await prisma.payroll.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!item)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch payroll" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: { params: any }) {
  const { id } = (await params) as { id: string };
  try {
    const body = await req.json();
    const parseDate = (v: any) => {
      if (!v && v !== 0) return null;
      const d = v instanceof Date ? v : new Date(v);
      return isNaN(d.getTime()) ? null : d;
    };

    const data: any = {
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

    const updated = await prisma.payroll.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update payroll" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: any }) {
  const { id } = (await params) as { id: string };
  try {
    await prisma.payroll.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete payroll" },
      { status: 500 }
    );
  }
}
