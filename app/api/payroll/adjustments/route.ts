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
            const { 
              empId, 
              incentives, 
              comission, 
              shortages, 
              marketCredit,
              attendanceAllowance,
              dailyAllowance,
              fuelAllowance,
              conveyanceAllowance,
              maintainence,
              eachKpiIncentives,
              olpersMilk,
              olpersCareem,
              eidIncentive,
              olpers500ml,
              categoryIncentive
            } = record;
            
            // Find employee by employeeId (the string one, e.g., CCI-01-0001)
            const employee = await tx.employee.findUnique({
                where: { employeeId: empId }
            });

            if (!employee) continue;

            const adjustmentData = {
                incentives: parseFloat(incentives) || 0,
                comission: parseFloat(comission) || 0,
                shortages: parseFloat(shortages) || 0,
                marketCredit: parseFloat(marketCredit) || 0,
                attendanceAllowance: parseFloat(attendanceAllowance) || 0,
                dailyAllowance: parseFloat(dailyAllowance) || 0,
                fuelAllowance: parseFloat(fuelAllowance) || 0,
                conveyanceAllowance: parseFloat(conveyanceAllowance) || 0,
                maintainence: parseFloat(maintainence) || 0,
                eachKpiIncentives: parseFloat(eachKpiIncentives) || 0,
                olpersMilk: parseFloat(olpersMilk) || 0,
                olpersCareem: parseFloat(olpersCareem) || 0,
                eidIncentive: parseFloat(eidIncentive) || 0,
                olpers500ml: parseFloat(olpers500ml) || 0,
                categoryIncentive: parseFloat(categoryIncentive) || 0,
            };

            const adjustment = await tx.employeeAdjustment.upsert({
                where: {
                    employeeId_month_year: {
                        employeeId: employee.id,
                        month,
                        year
                    }
                },
                update: adjustmentData,
                create: {
                    employeeId: employee.id,
                    month,
                    year,
                    ...adjustmentData
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
