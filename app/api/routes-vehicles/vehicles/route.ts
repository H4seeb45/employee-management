import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const vehicles = await prisma.vehicle.findMany({
    where: { locationId: user.locationId },
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
        locationId: user.locationId,
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
      locationId: user.locationId,
    },
  });

  return NextResponse.json({ vehicle }, { status: 201 });
}
