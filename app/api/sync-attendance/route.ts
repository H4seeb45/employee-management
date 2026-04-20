import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { logs, apiKey } = await req.json();

  if (apiKey !== process.env.BRIDGE_API_KEY) return new Response("Unauthorized", { status: 401 });

  for (const log of logs) {
    const logDate = new Date(log.time);
    const dateStr = logDate.toLocaleDateString('en-GB', { timeZone: "Asia/Karachi" });
    const [d, m, y] = dateStr.split('/').map(Number);
    const dateOnly = new Date(Date.UTC(y, m - 1, d));
    const timeString = logDate.toLocaleTimeString('en-GB', { hour12: false, timeZone: "Asia/Karachi" });

    // Look up the employee by their custom Employee ID (log.userId)
    const employee = await prisma.employee.findUnique({
      where: { employeeId: log.userId.toString() },
      select: { id: true }
    });

    if (!employee) {
      console.warn(`Sync Warning: No employee found with ID ${log.userId}. Skipping log.`);
      continue;
    }

    await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: employee.id, // Use the internal CUID
          date: dateOnly
        }
      },
      update: {
        checkOut: timeString,
        status: "Present"
      },
      create: {
        employeeId: employee.id,
        date: dateOnly,
        checkIn: timeString,
        status: "Present"
      }
    });
  }

  return NextResponse.json({ success: true });
}