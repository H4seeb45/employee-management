import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: any }) {
  const { id } = (await params) as { id: string };
  try {
    const item = await prisma.loan.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!item)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch loan" },
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

    const updated = await prisma.loan.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update loan" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: any }) {
  const { id } = (await params) as { id: string };
  try {
    await prisma.loan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete loan" },
      { status: 500 }
    );
  }
}
