import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = isAdminUser(user);
    const record = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!record)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!isAdmin && record.employee?.locationId !== user.locationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch leave request" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = isAdminUser(user);
    const { id } = await params;
    const body = await req.json();

    const parseDate = (val: any) => {
      if (val === null || val === undefined || val === "") return undefined;
      if (val instanceof Date) return isNaN(val.getTime()) ? undefined : val;
      const parsed = new Date(val);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    };

    if (!isAdmin) {
      const existing = await prisma.leaveRequest.findUnique({
        where: { id },
        include: { employee: true },
      });
      if (!existing || existing.employee?.userId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // Employees cannot approve/reject their own requests
      if (body.status && body.status !== existing.status) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const updateData: any = {};
    if (body.startDate) updateData.startDate = parseDate(body.startDate);
    if (body.endDate) updateData.endDate = parseDate(body.endDate);
    if (body.days) updateData.days = parseInt(body.days.toString());
    if (body.reason) updateData.reason = body.reason;
    if (body.status) updateData.status = body.status;
    if (body.leaveType) updateData.leaveType = body.leaveType;

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update leave request" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = isAdminUser(user);
    const { id } = await params;
    if (!isAdmin) {
      const existing = await prisma.leaveRequest.findUnique({
        where: { id },
        include: { employee: true },
      });
      if (!existing || existing.employee?.locationId !== user.locationId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    await prisma.leaveRequest.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete leave request" },
      { status: 500 }
    );
  }
}
