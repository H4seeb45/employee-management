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
    const { data } = body;

    if (!Array.isArray(data)) {
      return NextResponse.json({ message: "Invalid payload: 'data' must be an array" }, { status: 400 });
    }

    let count = 0;
    const errors: string[] = [];

    for (const [index, row] of data.entries()) {
      try {
        const employeeId = String(row.employeeId || "").trim();
        const advanceAmount = parseFloat(row.advanceAmount);
        const loanAmount = parseFloat(row.loanAmount);

        if (!employeeId) {
          errors.push(`Row ${index + 2}: Missing Employee ID`);
          continue;
        }

        const employee = await prisma.employee.findUnique({
          where: { employeeId },
        });

        if (!employee) {
          errors.push(`Row ${index + 2}: Employee with ID ${employeeId} not found`);
          continue;
        }

        await prisma.employee.update({
          where: { employeeId },
          data: {
            advanceEligibilityAmount: isNaN(advanceAmount) ? undefined : advanceAmount,
            loanEligibilityAmount: isNaN(loanAmount) ? undefined : loanAmount,
          },
        });

        count++;
      } catch (err: any) {
        errors.push(`Row ${index + 2}: Failed to update. ${err.message || 'Unknown error'}`);
      }
    }

    return NextResponse.json({ success: true, count, errors });
  } catch (error) {
    console.error("Error bulk updating eligibility:", error);
    return NextResponse.json({ message: "Error processing bulk update" }, { status: 500 });
  }
}
