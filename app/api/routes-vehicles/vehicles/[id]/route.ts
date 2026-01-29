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
  const vehicleNo = body?.vehicleNo?.toString().trim();
  const type = body?.type?.toString().trim();
  const model = body?.model?.toString().trim();
  const isActive = body?.isActive;

  const updateData: any = {};
  if (vehicleNo !== undefined) updateData.vehicleNo = vehicleNo;
  if (type !== undefined) updateData.type = type;
  if (model !== undefined) updateData.model = model;
  if (isActive !== undefined) updateData.isActive = isActive;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { message: "No fields to update." },
      { status: 400 }
    );
  }

  // Check if vehicleNo is being changed and if it already exists
  if (vehicleNo) {
    const existing = await prisma.vehicle.findFirst({
      where: {
        vehicleNo,
        id: { not: params.id },
      },
    });

    if (existing) {
      return NextResponse.json(
        { message: "Vehicle number already exists." },
        { status: 400 }
      );
    }
  }

  const vehicle = await prisma.vehicle.update({
    where: { 
      id: params.id,
      locationId: user.locationId,
    },
    data: updateData,
  });

  return NextResponse.json({ vehicle });
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

  await prisma.vehicle.delete({
    where: { 
      id: params.id,
      locationId: user.locationId,
    },
  });

  return NextResponse.json({ message: "Vehicle deleted successfully." });
}
