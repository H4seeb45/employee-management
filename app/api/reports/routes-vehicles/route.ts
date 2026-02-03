import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser, isSuperAdminUser, hasRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const isAccountant = hasRole(user, "Accountant");
  const isBM = hasRole(user, "Business Manager");
  if (!isBM && !isAccountant && !isAdminUser(user)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const isSuperAdmin = isSuperAdminUser(user);
  const locationId = (isSuperAdmin || isAccountant) ? searchParams.get("locationId") : user.locationId;

  const where: any = locationId ? { locationId } : {};

  const [routes, vehicles] = await Promise.all([
    prisma.route.findMany({
      where,
      include: { location: true },
      orderBy: { routeNo: "asc" },
    }),
    prisma.vehicle.findMany({
      where,
      include: { location: true },
      orderBy: { vehicleNo: "asc" },
    }),
  ]);

  return NextResponse.json({ routes, vehicles });
}
