import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser, isSuperAdminUser } from "@/lib/auth";

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
    const { employees, defaultLocationId } = body;

    if (!Array.isArray(employees)) {
      return NextResponse.json({ message: "Invalid payload: 'employees' must be an array" }, { status: 400 });
    }

    const isSuperAdmin = isSuperAdminUser(user);
    const authorizedIds = [
      user.locationId,
      ...(user.authorizedLocations?.map((l: any) => l.id) || []),
    ].filter(Boolean);

    let count = 0;
    const errors: string[] = [];

    for (const [index, employeeData] of employees.entries()) {
      try {
        if (!employeeData.employeeId || !employeeData.employeeName) {
          errors.push(`Row ${index + 2}: Missing required fields (Employee ID or Name)`);
          continue;
        }

        let targetLocationId = employeeData.locationId || defaultLocationId || (isSuperAdmin ? null : user.locationId);
        
        if (targetLocationId === "all") targetLocationId = isSuperAdmin ? null : user.locationId;

        // Authorization check
        if (!isSuperAdmin && targetLocationId && !authorizedIds.includes(targetLocationId)) {
           errors.push(`Row ${index + 2}: Forbidden. You are not authorized for Location ID ${targetLocationId}`);
           continue;
        }

        const existing = await prisma.employee.findUnique({
          where: { employeeId: employeeData.employeeId },
        });

        // Map frontend strings to dates safely
        const { 
          cnicIssueDate, cnicExpiryDate, birthDate, joinDate, leaveDate, probationConfirmationDate,
          ...data 
        } = employeeData;

        const payload = {
          ...data,
          locationId: targetLocationId,
          cnicIssueDate: cnicIssueDate ? new Date(cnicIssueDate) : null,
          cnicExpiryDate: cnicExpiryDate ? new Date(cnicExpiryDate) : null,
          birthDate: birthDate ? new Date(birthDate) : null,
          joinDate: joinDate ? new Date(joinDate) : null,
          leaveDate: leaveDate ? new Date(leaveDate) : null,
          probationConfirmationDate: probationConfirmationDate ? new Date(probationConfirmationDate) : null,
        };

        if (existing) {
          await prisma.employee.update({
            where: { id: existing.id },
            data: payload,
          });
        } else {
          await prisma.employee.create({
            data: payload,
          });
        }

        count++;
      } catch (err: any) {
        errors.push(`Row ${index + 2}: Failed to insert. ${err.message || 'Unknown error'}`);
      }
    }

    return NextResponse.json({ success: true, count, errors });
  } catch (error) {
    console.error("Error batch inserting employees:", error);
    return NextResponse.json({ message: "Error processing batch import" }, { status: 500 });
  }
}
