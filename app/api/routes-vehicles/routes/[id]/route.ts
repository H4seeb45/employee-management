import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (!isAdminUser(user)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const routeNo = body?.routeNo?.toString().trim();
  const name = body?.name?.toString().trim();
  const description = body?.description?.toString().trim() ?? null;
  const isActive = body?.isActive;

  const updateData: any = {};
  if (routeNo !== undefined) updateData.routeNo = routeNo;
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (isActive !== undefined) updateData.isActive = isActive;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { message: "No fields to update." },
      { status: 400 }
    );
  }

  // Check if routeNo is being changed and if it already exists
  if (routeNo) {
    const existing = await prisma.route.findFirst({
      where: {
        routeNo,
        id: { not: params.id },
      },
    });

    if (existing) {
      return NextResponse.json(
        { message: "Route number already exists." },
        { status: 400 }
      );
    }
  }

  const route = await prisma.route.update({
    where: { 
      id: params.id,
      locationId: user.locationId,
    },
    data: updateData,
  });

  return NextResponse.json({ route });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (!isAdminUser(user)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  await prisma.route.delete({
    where: { 
      id: params.id,
      locationId: user.locationId,
    },
  });

  return NextResponse.json({ message: "Route deleted successfully." });
}
