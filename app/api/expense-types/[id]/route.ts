import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser, isSuperAdminUser } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const expenseType = await prisma.expenseType.findUnique({
    where: { id: params.id },
    include: { location: true },
  });

  if (!expenseType) {
    return NextResponse.json({ message: "Expense type not found." }, { status: 404 });
  }

  return NextResponse.json({ expenseType });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const isAdmin = isAdminUser(user) || isSuperAdminUser(user);
  if (!isAdmin) {
    return NextResponse.json({ message: "Forbidden. Admin access required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, description, locationId, isActive, requiresRouteAndVehicle, expenseCode } = body;

    const expenseType = await prisma.expenseType.update({
      where: { id: params.id },
      data: {
        name: name || undefined,
        description: description || undefined,
        locationId: locationId || undefined,
        expenseCode: expenseCode || undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        requiresRouteAndVehicle: requiresRouteAndVehicle !== undefined ? requiresRouteAndVehicle : undefined,
      },
    });

    return NextResponse.json({ expenseType });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ message: "An expense type with this name already exists for this location." }, { status: 400 });
    }
    return NextResponse.json({ message: error.message || "Failed to update expense type." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const isAdmin = isAdminUser(user) || isSuperAdminUser(user);
  if (!isAdmin) {
    return NextResponse.json({ message: "Forbidden. Admin access required." }, { status: 403 });
  }

  try {
    // Check if expense type is in use
    const sheetCount = await prisma.expenseSheet.count({
      where: { expenseTypeId: params.id },
    });

    if (sheetCount > 0) {
      return NextResponse.json({ message: "Cannot delete expense type that is in use. Deactivate it instead." }, { status: 400 });
    }

    await prisma.expenseType.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Expense type deleted successfully." });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to delete expense type." }, { status: 500 });
  }
}
