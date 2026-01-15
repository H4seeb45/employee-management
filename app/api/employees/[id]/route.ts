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
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { location: true },
    });
    if (!employee)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!isAdmin && employee.locationId !== user.locationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(employee);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch employee" },
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
      const existing = await prisma.employee.findUnique({ where: { id } });
      if (!existing || existing.locationId !== user.locationId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (body.locationId && body.locationId !== user.locationId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      body.locationId = user.locationId;
    }
    const updated = await prisma.employee.update({ where: { id }, data: body });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update employee" },
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
      const existing = await prisma.employee.findUnique({ where: { id } });
      if (!existing || existing.locationId !== user.locationId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    await prisma.employee.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}
