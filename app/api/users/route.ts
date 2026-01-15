import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generatePassword,
  getCurrentUser,
  hashPassword,
  isAdminUser,
  isSuperAdminUser,
} from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }
  if (!isAdminUser(user)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const isSuperAdmin = isSuperAdminUser(user);
  const locationId = isSuperAdmin ? searchParams.get("locationId") : null;
  const users = await prisma.user.findMany({
    where: locationId ? { locationId } : undefined,
    include: { location: true, roles: { include: { role: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    users: users.map((item) => ({
      id: item.id,
      email: item.email,
      isActive: item.isActive,
      location: item.location,
      roles: item.roles.map((userRole) => userRole.role),
      createdAt: item.createdAt,
    })),
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }
  if (!isAdminUser(user)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const email = body?.email?.toString().trim().toLowerCase();
  const locationId = body?.locationId?.toString();
  const roleIds = Array.isArray(body?.roleIds)
    ? body.roleIds.map((roleId: unknown) => roleId?.toString()).filter(Boolean)
    : [];

  if (!email || !locationId || roleIds.length === 0) {
    return NextResponse.json(
      { message: "Email, location, and roles are required." },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { message: "User already exists." },
      { status: 409 }
    );
  }

  const [location, roles] = await Promise.all([
    prisma.location.findUnique({ where: { id: locationId } }),
    prisma.role.findMany({ where: { id: { in: roleIds } } }),
  ]);

  if (!location) {
    return NextResponse.json({ message: "Location not found." }, { status: 404 });
  }
  if (roles.length !== roleIds.length) {
    return NextResponse.json({ message: "Invalid role selection." }, { status: 400 });
  }

  const plainPassword = generatePassword();
  const passwordHash = await hashPassword(plainPassword);

  const created = await prisma.user.create({
    data: {
      email,
      passwordHash,
      locationId: location.id,
      roles: { create: roleIds.map((roleId: string) => ({ roleId })) },
    },
    include: { location: true, roles: { include: { role: true } } },
  });

  return NextResponse.json({
    user: {
      id: created.id,
      email: created.email,
      isActive: created.isActive,
      location: created.location,
      roles: created.roles.map((userRole) => userRole.role),
    },
    password: plainPassword,
  });
}
