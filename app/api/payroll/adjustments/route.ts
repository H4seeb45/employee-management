import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;
    const locationId = searchParams.get("locationId");

    if (!month || !year) {
        return NextResponse.json({ error: "Month and Year are required" }, { status: 400 });
    }

    const where: any = { month, year };
    if (locationId && locationId !== "all") {
        where.employee = { locationId };
    }

    const adjustments = await prisma.employeeAdjustment.findMany({
      where,
      include: { 
        employee: {
            select: {
                employeeId: true,
                employeeName: true,
                position: true,
                department: true,
                location: { select: { name: true } }
            }
        } 
      },
      orderBy: { employee: { employeeName: 'asc' } }
    });

    return NextResponse.json(adjustments);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch adjustments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !isAdminUser(user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { month, year, records } = await request.json();

    if (!month || !year || !Array.isArray(records)) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Process records in a transaction
    const results = await prisma.$transaction(async (tx) => {
        const processed = [];
        for (const record of records) {
            const { empId, incentives, comission, shortages, marketCredit } = record;
            
            // Find employee by employeeId (the string one, e.g., CCI-01-0001)
            const employee = await tx.employee.findUnique({
                where: { employeeId: empId }
            });

            if (!employee) continue;

            const adjustment = await tx.employeeAdjustment.upsert({
                where: {
                    employeeId_month_year: {
                        employeeId: employee.id,
                        month,
                        year
                    }
                },
                update: {
                    incentives: incentives || 0,
                    comission: comission || 0,
                    shortages: shortages || 0,
                    marketCredit: marketCredit || 0
                },
                create: {
                    employeeId: employee.id,
                    month,
                    year,
                    incentives: incentives || 0,
                    comission: comission || 0,
                    shortages: shortages || 0,
                    marketCredit: marketCredit || 0
                }
            });
            processed.push(adjustment);
        }
        return processed;
    });

    return NextResponse.json({ success: true, count: results.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save adjustments" }, { status: 500 });
  }
}
