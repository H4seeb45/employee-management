import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = isAdminUser(user);
    const { id } = (await params) as { id: string };
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
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = isAdminUser(user);
    const { id } = (await params) as { id: string };
    const body = await req.json();
    if (!isAdmin) {
      const existing = await prisma.leaveRequest.findUnique({
        where: { id },
        include: { employee: true },
      });
      if (!existing || existing.employee?.locationId !== user.locationId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (body.employeeId && body.employeeId !== existing.employeeId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update leave request" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = isAdminUser(user);
    const { id } = (await params) as { id: string };
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
