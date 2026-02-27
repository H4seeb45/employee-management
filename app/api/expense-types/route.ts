import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser, isSuperAdminUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId");
  const isActiveOnly = searchParams.get("active") === "true";

  const isAdmin = isAdminUser(user) || isSuperAdminUser(user);
  
  const where: any = {};
  if (isActiveOnly) {
    where.isActive = true;
  }

  // If user is admin, they can see all or filter by location
  if (isAdmin) {
    if (locationId && locationId !== "all") {
      where.locationId = locationId;
    }
  } else {
    // Regular users can only see their own location's types or authorized locations
    const authorizedIds = [
      user.locationId,
      ...(user.authorizedLocations?.map((l: any) => l.id) || []),
    ].filter(Boolean);

    if (locationId && locationId !== "all") {
      if (authorizedIds.includes(locationId)) {
        where.locationId = locationId;
      } else {
        where.locationId = { in: authorizedIds };
      }
    } else {
      where.locationId = { in: authorizedIds };
    }
  }

  const expenseTypes = await prisma.expenseType.findMany({
    where,
    include: {
      location: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ expenseTypes });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const isAdmin = isAdminUser(user) || isSuperAdminUser(user);
  if (!isAdmin) {
    return NextResponse.json({ message: "Forbidden. Admin access required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    
    // Check if it's an array for bulk import
    if (Array.isArray(body)) {
      const results = [];
      const errors = [];
      
      for (const item of body) {
        const { name, description, locationId, isActive, requiresRouteAndVehicle, expenseCode } = item;
        
        if (!name || !locationId || !expenseCode) {
          errors.push({ item, message: "Name, Location, and Expense Code are required." });
          continue;
        }
        
        try {
          const expenseType = await prisma.expenseType.create({
            data: {
              name,
              description,
              location: { connect: { id: locationId } },
              expenseCode,
              isActive: isActive !== undefined ? isActive : true,
              requiresRouteAndVehicle: requiresRouteAndVehicle || false,
            },
          });
          results.push(expenseType);
        } catch (err: any) {
          if (err.code === 'P2002') {
            errors.push({ item, message: `Type "${name}" already exists for this location.` });
          } else {
            errors.push({ item, message: err.message });
          }
        }
      }
      
      return NextResponse.json({ 
        message: `Imported ${results.length} types. ${errors.length} errors.`,
        imported: results.length,
        errors: errors 
      }, { status: 201 });
    }

    // Single creation
    const { name, description, locationId, isActive, requiresRouteAndVehicle, expenseCode } = body;

    if (!name || !locationId || !expenseCode) {
      return NextResponse.json({ message: "Name, Location, and Expense Code are required." }, { status: 400 });
    }

    const expenseType = await prisma.expenseType.create({
      data: {
        name,
        description,
        location: { connect: { id: locationId } },
        expenseCode,
        isActive: isActive !== undefined ? isActive : true,
        requiresRouteAndVehicle: requiresRouteAndVehicle || false,
      },
    });

    return NextResponse.json({ expenseType }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ message: "An expense type with this name already exists for this location." }, { status: 400 });
    }
    return NextResponse.json({ message: error.message || "Failed to create expense type." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const isAdmin = isAdminUser(user) || isSuperAdminUser(user);
  if (!isAdmin) {
    return NextResponse.json({ message: "Forbidden. Admin access required." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId");

  if (!locationId || locationId === "all") {
    return NextResponse.json({ message: "Valid Location ID is required for bulk delete." }, { status: 400 });
  }

  try {
    // Check if any types in this location are in use
    const usedTypes = await prisma.expenseType.findMany({
      where: {
        locationId,
        expenseSheets: { some: {} }
      },
      select: { id: true, name: true }
    });

    if (usedTypes.length > 0) {
      return NextResponse.json({ 
        message: `Cannot delete all types. ${usedTypes.length} types are currently in use by expense sheets.`,
        usedTypes: usedTypes.map((t: any) => t.name)
      }, { status: 400 });
    }

    const { count } = await prisma.expenseType.deleteMany({
      where: { locationId }
    });

    return NextResponse.json({ message: `Successfully deleted ${count} expense types.` });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to perform bulk delete." }, { status: 500 });
  }
}
