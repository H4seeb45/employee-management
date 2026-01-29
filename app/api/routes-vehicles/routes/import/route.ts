import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

type ImportResult = {
  success: boolean;
  routeNo: string;
  name?: string;
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
  const routes = Array.isArray(body?.routes) ? body.routes : [];

  if (routes.length === 0) {
    return NextResponse.json(
      { message: "No routes provided." },
      { status: 400 }
    );
  }

  const results: ImportResult[] = [];

  for (const route of routes) {
    const routeNo = route?.routeNo?.toString().trim();
    const name = route?.name?.toString().trim();
    const description = route?.description?.toString().trim() ?? null;

    if (!routeNo || !name) {
      results.push({
        success: false,
        routeNo: routeNo || "N/A",
        error: "Route number and name are required.",
      });
      continue;
    }

    try {
      // Check if route already exists
      const existing = await prisma.route.findUnique({
        where: {
          routeNo_locationId: {
            routeNo,
            locationId: user.locationId,
          },
        },
      });

      if (existing) {
        results.push({
          success: false,
          routeNo,
          name,
          error: "Route number already exists.",
        });
        continue;
      }

      // Create the route
      await prisma.route.create({
        data: {
          routeNo,
          name,
          description,
          locationId: user.locationId,
        },
      });

      results.push({
        success: true,
        routeNo,
        name,
      });
    } catch (error) {
      results.push({
        success: false,
        routeNo,
        name,
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
