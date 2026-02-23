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
  // If isAdmin and requestedLocationId is null, show all vehicles (where is {})

  const vehicles = await prisma.vehicle.findMany({
    where,
    include: { location: true }, // Include location to show which location the vehicle belongs to
    orderBy: { vehicleNo: "asc" },
  });

  return NextResponse.json({ vehicles });
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
  const vehicleNo = body?.vehicleNo?.toString().trim();
  const type = body?.type?.toString().trim() ?? null;
  const model = body?.model?.toString().trim() ?? null;
  const locationId = body?.locationId || user.locationId;

  if (!vehicleNo) {
    return NextResponse.json(
      { message: "Vehicle number is required." },
      { status: 400 }
    );
  }

  const existing = await prisma.vehicle.findUnique({
    where: {
      vehicleNo_locationId: {
        vehicleNo,
        locationId,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { message: "Vehicle number already exists." },
      { status: 400 }
    );
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      vehicleNo,
      type,
      model,
      locationId,
    },
  });

  return NextResponse.json({ vehicle }, { status: 201 });
}
