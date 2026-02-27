import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { mappings } = await request.json();

    if (!Array.isArray(mappings)) {
      return NextResponse.json({ message: "Invalid mappings data." }, { status: 400 });
    }

    // Process each mapping
    const results = [];
    for (const mapping of mappings) {
      const { recordId, expenseCode } = mapping;

      if (!recordId || !expenseCode) continue;

      // Find the expense sheet to get its locationId
      const sheet = await prisma.expenseSheet.findUnique({
        where: { id: recordId },
        select: { locationId: true }
      });

      if (!sheet) {
        results.push({ recordId, status: "error", message: "Expense sheet not found" });
        continue;
      }

      // Find the expense type with this code and locationId
      const expenseType = await prisma.expenseType.findFirst({
        where: {
          expenseCode: expenseCode,
          locationId: sheet.locationId
        }
      });

      if (!expenseType) {
        results.push({ recordId, status: "error", message: `Expense code '${expenseCode}' not found for location` });
        continue;
      }

      // Update the expense sheet
      await prisma.expenseSheet.update({
        where: { id: recordId },
        data: {
          expenseTypeId: expenseType.id,
          // Clear legacy enum if it matches
          expenseTypeEnum: null
        }
      });

      results.push({ recordId, status: "success" });
    }

    const successCount = results.filter(r => r.status === "success").length;
    return NextResponse.json({ 
      message: `Successfully mapped ${successCount} out of ${mappings.length} records.`,
      results 
    });

  } catch (error: any) {
    console.error("[BULK_MAP_EXPENSES]", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
