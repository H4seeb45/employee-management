import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const routes = await prisma.route.findMany({
    where: { locationId: user.locationId },
    orderBy: { routeNo: "asc" },
  });

  return NextResponse.json({ routes });
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
  const routeNo = body?.routeNo?.toString().trim();
  const name = body?.name?.toString().trim();
  const description = body?.description?.toString().trim() ?? null;

  if (!routeNo || !name) {
    return NextResponse.json(
      { message: "Route number and name are required." },
      { status: 400 }
    );
  }

  const existing = await prisma.route.findUnique({
    where: { 
      routeNo_locationId: {
        routeNo,
        locationId: user.locationId,
      }
    },
  });

  if (existing) {
    return NextResponse.json(
      { message: "Route number already exists in this location." },
      { status: 400 }
    );
  }

  const route = await prisma.route.create({
    data: {
      routeNo,
      name,
      description,
      locationId: user.locationId,
    },
  });

  return NextResponse.json({ route }, { status: 201 });
}
