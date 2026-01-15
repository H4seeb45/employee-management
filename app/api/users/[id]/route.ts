import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

type RouteParams = {
  params: {
    id: string;
  };
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }
  if (!isAdminUser(user)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const locationId = body?.locationId?.toString();
  const isActive = typeof body?.isActive === "boolean" ? body.isActive : undefined;
  const roleIds = Array.isArray(body?.roleIds)
    ? body.roleIds.map((roleId: unknown) => roleId?.toString()).filter(Boolean)
    : undefined;

  if (!locationId && typeof isActive !== "boolean" && !roleIds) {
    return NextResponse.json({ message: "No updates provided." }, { status: 400 });
  }

  if (locationId) {
    const location = await prisma.location.findUnique({ where: { id: locationId } });
    if (!location) {
      return NextResponse.json({ message: "Location not found." }, { status: 404 });
    }
  }

  if (roleIds) {
    const roles = await prisma.role.findMany({ where: { id: { in: roleIds } } });
    if (roles.length !== roleIds.length) {
      return NextResponse.json({ message: "Invalid role selection." }, { status: 400 });
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: params.id },
    data: {
      ...(locationId ? { locationId } : {}),
      ...(typeof isActive === "boolean" ? { isActive } : {}),
      ...(roleIds
        ? {
            roles: {
              deleteMany: {},
              create: roleIds.map((roleId: string) => ({ roleId })),
            },
          }
        : {}),
    },
    include: { location: true, roles: { include: { role: true } } },
  });

  return NextResponse.json({
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      isActive: updatedUser.isActive,
      location: updatedUser.location,
      roles: updatedUser.roles.map((userRole) => userRole.role),
    },
  });
}
