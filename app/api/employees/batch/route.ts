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
    const { employees } = body;

    if (!Array.isArray(employees)) {
      return NextResponse.json({ message: "Invalid payload: 'employees' must be an array" }, { status: 400 });
    }

    let count = 0;
    const errors: string[] = [];

    for (const [index, employeeData] of employees.entries()) {
      try {
        if (!employeeData.employeeId || !employeeData.employeeName) {
          errors.push(`Row ${index + 2}: Missing required fields (Employee ID or Name)`);
          continue;
        }

        const existing = await prisma.employee.findUnique({
          where: { employeeId: employeeData.employeeId },
        });

        if (existing) {
          errors.push(`Row ${index + 2}: Employee ID ${employeeData.employeeId} already exists`);
          continue;
        }

        const targetLocationId = employeeData.locationId || (isSuperAdminUser(user) ? null : user.locationId);

        // Map frontend strings to dates safely
        const { 
          cnicIssueDate, cnicExpiryDate, birthDate, joinDate, leaveDate, probationConfirmationDate,
          ...data 
        } = employeeData;

        await prisma.employee.create({
          data: {
            ...data,
            locationId: targetLocationId,
            cnicIssueDate: cnicIssueDate ? new Date(cnicIssueDate) : null,
            cnicExpiryDate: cnicExpiryDate ? new Date(cnicExpiryDate) : null,
            birthDate: birthDate ? new Date(birthDate) : null,
            joinDate: joinDate ? new Date(joinDate) : null,
            leaveDate: leaveDate ? new Date(leaveDate) : null,
            probationConfirmationDate: probationConfirmationDate ? new Date(probationConfirmationDate) : null,
          },
        });

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
