import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: any }) {
  const { id } = (await params) as { id: string };
  try {
    const user = await getCurrentUser(_req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = isAdminUser(user);
    const item = await prisma.loan.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!item)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!isAdmin && item.employee?.locationId !== user.locationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(item);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch loan" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: any }) {
  const { id } = (await params) as { id: string };
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

    if (!isAdmin) {
      const existing = await prisma.loan.findUnique({
        where: { id },
        include: { employee: true },
      });
      if (!existing || existing.employee?.locationId !== user.locationId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

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

export async function DELETE(_req: NextRequest, { params }: { params: any }) {
  const { id } = (await params) as { id: string };
  try {
    const user = await getCurrentUser(_req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = isAdminUser(user);
    if (!isAdmin) {
      const existing = await prisma.loan.findUnique({
        where: { id },
        include: { employee: true },
      });
      if (!existing || existing.employee?.locationId !== user.locationId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
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
