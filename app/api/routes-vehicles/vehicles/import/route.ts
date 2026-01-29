import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

type ImportResult = {
  success: boolean;
  vehicleNo: string;
  type?: string;
  model?: string;
  error?: string;
};

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (!isAdminUser(user)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const vehicles = Array.isArray(body?.vehicles) ? body.vehicles : [];

  if (vehicles.length === 0) {
    return NextResponse.json(
      { message: "No vehicles provided." },
      { status: 400 }
    );
  }

  const results: ImportResult[] = [];

  for (const vehicle of vehicles) {
    const vehicleNo = vehicle?.vehicleNo?.toString().trim();
    const type = vehicle?.type?.toString().trim() ?? null;
    const model = vehicle?.model?.toString().trim() ?? null;

    if (!vehicleNo) {
      results.push({
        success: false,
        vehicleNo: "N/A",
        error: "Vehicle number is required.",
      });
      continue;
    }

    try {
      // Check if vehicle already exists
      const existing = await prisma.vehicle.findUnique({
        where: {
          vehicleNo_locationId: {
            vehicleNo,
            locationId: user.locationId,
          },
        },
      });

      if (existing) {
        results.push({
          success: false,
          vehicleNo,
          type: type || undefined,
          model: model || undefined,
          error: "Vehicle number already exists.",
        });
        continue;
      }

      // Create the vehicle
      await prisma.vehicle.create({
        data: {
          vehicleNo,
          type,
          model,
          locationId: user.locationId,
        },
      });

      results.push({
        success: true,
        vehicleNo,
        type: type || undefined,
        model: model || undefined,
      });
    } catch (error) {
      results.push({
        success: false,
        vehicleNo,
        type: type || undefined,
        model: model || undefined,
        error: error instanceof Error ? error.message : "Unknown error occurred.",
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  return NextResponse.json({
    message: `Import completed: ${successCount} succeeded, ${failureCount} failed.`,
    results,
    summary: {
      total: results.length,
      success: successCount,
      failed: failureCount,
    },
  });
}
