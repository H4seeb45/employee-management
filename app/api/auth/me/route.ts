import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";

import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const employeeRecord = await prisma.employee.findUnique({
     where: { userId: user.id }
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      locationId: user.locationId,
      roles: user.roles.map((userRole) => userRole.role.name),
      authorizedLocations: user.authorizedLocations,
      employeeId: employeeRecord?.id || user.email.split("@")[0],
    },
  });
}
