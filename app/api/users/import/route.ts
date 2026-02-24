import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generatePassword,
  getCurrentUser,
  hashPassword,
  isAdminUser,
} from "@/lib/auth";

type ImportResult = {
  success: boolean;
  email: string;
  password?: string;
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
  const usersToImport = Array.isArray(body?.users) ? body.users : [];

  if (usersToImport.length === 0) {
    return NextResponse.json(
      { message: "No users provided." },
      { status: 400 }
    );
  }

  const results: ImportResult[] = [];

  // Pre-fetch all roles and locations to avoid repeated queries
  const [allRoles, allLocations] = await Promise.all([
    prisma.role.findMany(),
    prisma.location.findMany(),
  ]);

  for (const item of usersToImport) {
    const email = item?.email?.toString().trim().toLowerCase();
    const locationName = item?.location?.toString().trim();
    const roleNamesString = item?.roles?.toString().trim();
    const authorizedLocationsString = item?.authorizedLocations?.toString().trim();

    if (!email || !locationName || !roleNamesString) {
      results.push({
        success: false,
        email: email || "N/A",
        error: "Email, location, and roles are required.",
      });
      continue;
    }

    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        results.push({
          success: false,
          email,
          error: "User already exists.",
        });
        continue;
      }

      // Find location
      const location = allLocations.find(
        (l) =>
          l.name.toLowerCase() === locationName.toLowerCase() ||
          l.city.toLowerCase() === locationName.toLowerCase() ||
          `${l.city} - ${l.name}`.toLowerCase() === locationName.toLowerCase()
      );

      if (!location) {
        results.push({
          success: false,
          email,
          error: `Location "${locationName}" not found.`,
        });
        continue;
      }

      // Find roles
      const roleNames = roleNamesString.split(",").map((s: string) => s.trim().toLowerCase());
      const roles = allRoles.filter((r) =>
        roleNames.includes(r.name.toLowerCase())
      );

      if (roles.length === 0) {
        results.push({
          success: false,
          email,
          error: `No valid roles found in "${roleNamesString}".`,
        });
        continue;
      }

      // Find authorized locations
      let authorizedLocations: any[] = [];
      if (authorizedLocationsString) {
        const authLocNames = authorizedLocationsString.split(",").map((s: string) => s.trim().toLowerCase());
        authorizedLocations = allLocations.filter((l) =>
            authLocNames.includes(l.name.toLowerCase()) ||
            authLocNames.includes(l.city.toLowerCase()) ||
            authLocNames.includes(`${l.city} - ${l.name}`.toLowerCase())
        );
      }

      const plainPassword = generatePassword();
      const passwordHash = await hashPassword(plainPassword);

      await prisma.user.create({
        data: {
          email,
          passwordHash,
          locationId: location.id,
          roles: {
            create: roles.map((role) => ({ roleId: role.id })),
          },
          authorizedLocations: {
            connect: authorizedLocations.map((l) => ({ id: l.id })),
          },
        },
      });

      results.push({
        success: true,
        email,
        password: plainPassword,
      });
    } catch (error) {
      results.push({
        success: false,
        email,
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
