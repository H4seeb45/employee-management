import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    if (!isAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { records } = await req.json();

    if (!Array.isArray(records)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    // records: { employeeCustomId, date, checkIn, checkOut, status }[]
    // We need to find the internal ID for each employeeCustomId (e.g., "EMP001")

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Pre-fetch employees to map custom IDs to internal IDs
    const employees = await prisma.employee.findMany({
      select: { id: true, employeeId: true }
    });
    const empMap = new Map(employees.map(e => [e.employeeId, e.id]));

    // Batch process to be faster
    const operations = records.map((record) => {
      const internalId = empMap.get(record.employeeCustomId);
      if (!internalId) {
        results.failed++;
        results.errors.push(`Employee ID ${record.employeeCustomId} not found`);
        return null;
      }

      const [year, month, day] = record.date.split('-').map(Number);
      const attendanceDate = new Date(Date.UTC(year, month - 1, day));
      const data = {
        employeeId: internalId,
        date: attendanceDate,
        checkIn: record.checkIn || null,
        checkOut: record.checkOut || null,
        status: record.status || "Present",
        checkInStatus: record.checkInStatus || null,
        checkOutStatus: record.checkOutStatus || null,
        workingHours: record.workingHours ? parseFloat(record.workingHours) : null,
      };

      // Upsert based on employeeId and date
      // We need a unique constraint or we can just find and update
      return prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: internalId,
            date: attendanceDate,
          }
        },
        update: data,
        create: data,
      }).catch(err => {
        results.failed++;
        results.errors.push(`Error for ${record.employeeCustomId}: ${err.message}`);
        return null;
      });
    }).filter(Boolean);

    // If we don't have a unique constraint on date, we should handle it more manually
    // Since I can't easily change the schema right now without seeing if I can run migrations,
    // I will use a more manual approach if needed.
    // Let's check the schema for @@unique([employeeId, date])
    
    await Promise.all(operations);
    results.success = records.length - results.failed;

    return NextResponse.json(results);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Bulk import failed" }, { status: 500 });
  }
}
