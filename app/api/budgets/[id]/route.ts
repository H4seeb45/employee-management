import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser, isSuperAdminUser } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const isAdmin = isAdminUser(user);
  if (!isAdmin) {
    return NextResponse.json({ message: "Forbidden. Only Admins can approve budgets." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action; // 'approve' or 'reject'

  const budget = await prisma.budget.findUnique({
    where: { id },
  });

  if (!budget) {
    return NextResponse.json({ message: "Budget not found." }, { status: 404 });
  }

  // Check if admin belongs to the same location, unless they are super admin
  if (!isSuperAdminUser(user) && budget.locationId !== user.locationId) {
    return NextResponse.json({ message: "Forbidden. You can only manage budgets for your location." }, { status: 403 });
  }

  if (action === "approve") {
    const updated = await prisma.budget.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedById: user.id,
      },
    });
    return NextResponse.json({ budget: updated });
  }

  if (action === "reject") {
    const updated = await prisma.budget.update({
      where: { id },
      data: {
        status: "REJECTED",
      },
    });
    return NextResponse.json({ budget: updated });
  }

  return NextResponse.json({ message: "Invalid action." }, { status: 400 });
}
