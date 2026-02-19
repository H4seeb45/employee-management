import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser, isSuperAdminUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  const name = searchParams.get("name");
  const department = searchParams.get("department");
  const status = searchParams.get("status");
  const locationId = searchParams.get("locationId") || (isSuperAdminUser(user) ? null : user.locationId);

  const where: any = {};
  if (employeeId) where.employeeId = { contains: employeeId, mode: "insensitive" };
  if (name) where.employeeName = { contains: name, mode: "insensitive" };
  if (department && department !== "all") where.department = department;
  if (status && status !== "all") where.status = status;
  
  // Only apply location filter if it's specified or if user is NOT a super admin
  if (locationId) {
    where.locationId = locationId;
  }

  try {
    const employees = await prisma.employee.findMany({
      where,
      include: {
        location: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ employees });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json({ message: "Error fetching employees" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (!isAdminUser(user)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  try {
    const body = await request.json();
    
    // Basic validation
    if (!body.employeeId || !body.employeeName) {
      return NextResponse.json({ message: "Employee ID and Name are required" }, { status: 400 });
    }

    // Check if employeeId already exists
    const existing = await prisma.employee.findUnique({
      where: { employeeId: body.employeeId },
    });

    if (existing) {
      return NextResponse.json({ message: "Employee ID already exists" }, { status: 400 });
    }

    // Set locationId from user if not provided
    const targetLocationId = body.locationId || (isSuperAdminUser(user) ? null : user.locationId);

    const { 
      id: _id, 
      location: _location, 
      createdAt: _createdAt, 
      updatedAt: _updatedAt,
      cnicIssueDate,
      cnicExpiryDate,
      birthDate,
      joinDate,
      leaveDate,
      probationConfirmationDate,
      ...data 
    } = body;

    const employee = await prisma.employee.create({
      data: {
        ...data,
        locationId: targetLocationId,
        // Convert string dates to Date objects if they exist
        cnicIssueDate: cnicIssueDate ? new Date(cnicIssueDate) : null,
        cnicExpiryDate: cnicExpiryDate ? new Date(cnicExpiryDate) : null,
        birthDate: birthDate ? new Date(birthDate) : null,
        joinDate: joinDate ? new Date(joinDate) : null,
        leaveDate: leaveDate ? new Date(leaveDate) : null,
        probationConfirmationDate: probationConfirmationDate ? new Date(probationConfirmationDate) : null,
      },
    });

    return NextResponse.json({ employee });
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json({ message: "Error creating employee" }, { status: 500 });
  }
}
