import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

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
    const { loans, locationId: queryLocationId } = body;

    if (!Array.isArray(loans)) {
      return NextResponse.json({ message: "Invalid payload: 'loans' must be an array" }, { status: 400 });
    }

    const isSuperAdmin = isAdminUser(user) && user.roles.some((r: any) => r.role.name === "Super Admin");
    const authorizedIds = [
      user.locationId,
      ...(user.authorizedLocations?.map((l: any) => l.id) || []),
    ].filter(Boolean);

    // If queryLocationId is "all", we skip the strict single-location check but still verify authorizedIds
    const targetLocationId = queryLocationId === "all" ? null : queryLocationId;

    if (!isSuperAdmin && targetLocationId && !authorizedIds.includes(targetLocationId)) {
      return NextResponse.json({ message: "Forbidden: You are not authorized for this location." }, { status: 403 });
    }

    let count = 0;
    const errors: string[] = [];

    for (const [index, loanData] of loans.entries()) {
      try {
        const { employeeIdReadable, principalAmount, installments, issuedAt, status, notes, balance } = loanData;

        if (!employeeIdReadable || !principalAmount) {
          errors.push(`Row ${index + 2}: Missing required fields (Employee ID or Principal Amount)`);
          continue;
        }

        const employee = await prisma.employee.findUnique({
          where: { employeeId: employeeIdReadable },
        });

        if (!employee) {
          errors.push(`Row ${index + 2}: Employee with ID ${employeeIdReadable} not found`);
          continue;
        }

        // Location Check
        if (targetLocationId && employee.locationId !== targetLocationId) {
          errors.push(`Row ${index + 2}: Employee ${employeeIdReadable} is not in the selected location.`);
          continue;
        }

        // If "all" was selected, non-superadmin still needs to be authorized for the employee's location
        if (!isSuperAdmin && !targetLocationId && !authorizedIds.includes(employee.locationId)) {
          errors.push(`Row ${index + 2}: You are not authorized to create records for employee ${employeeIdReadable}'s location.`);
          continue;
        }

        await prisma.loan.create({
          data: {
            employeeId: employee.id,
            principalAmount: parseFloat(principalAmount) || 0,
            installments: parseInt(installments) || null,
            issuedAt: issuedAt ? new Date(issuedAt) : new Date(),
            status: status || "Approved",
            notes: notes || null,
            balance: balance !== undefined ? parseFloat(balance) : (parseFloat(principalAmount) || 0),
          },
        });

        count++;
      } catch (err: any) {
        errors.push(`Row ${index + 2}: Failed to insert. ${err.message || 'Unknown error'}`);
      }
    }

    return NextResponse.json({ success: true, count, errors });
  } catch (error) {
    console.error("Error batch inserting loans:", error);
    return NextResponse.json({ message: "Error processing batch import" }, { status: 500 });
  }
}
