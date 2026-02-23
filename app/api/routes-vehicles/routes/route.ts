import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole, isAdminUser, isSuperAdminUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedLocationId = searchParams.get("locationId");

  const where: any = {};
  const isAdmin = isAdminUser(user);
  const isAccountant = hasRole(user, "Accountant");
  const isSuperAdmin = isSuperAdminUser(user);
  const isCashier = hasRole(user, "Cashier");

  const authorizedIds = [
        user.locationId,
        ...(user.authorizedLocations?.map((l: any) => l.id) || []),
      ].filter(Boolean);

  if (requestedLocationId && (isAdmin || isAccountant || isSuperAdmin || isCashier)) {
    if(isCashier && !authorizedIds.includes(requestedLocationId)){
      where.locationId = { in: authorizedIds };
    }else{
      where.locationId = requestedLocationId;
    }
  } else if (!isAdmin && !isAccountant && !isSuperAdmin && !isCashier) {
    where.locationId = user.locationId;
  }
  // If isAdmin and requestedLocationId is null, show all routes (where is {})

  const routes = await prisma.route.findMany({
    where,
    include: { location: true }, // Include location to show which location the route belongs to
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
  const locationId = body?.locationId || user.locationId;

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
        locationId,
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
      locationId,
    },
  });

  return NextResponse.json({ route }, { status: 201 });
}
