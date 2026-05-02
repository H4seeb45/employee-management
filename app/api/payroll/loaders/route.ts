import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;
    const locationId = searchParams.get("locationId");

    if (!month || !year || !locationId) {
        return NextResponse.json({ error: "Month, Year and Location are required" }, { status: 400 });
    }

    const where: any = { month, year };
    if (locationId !== "all") {
        where.locationId = locationId;
    } else if (user.roles?.some((r: any) => r.role.name === "Admin")) {
        // admin can see all
    } else {
        // limit to user's authorized locations
        const authorizedLocations = user.authorizedLocations?.map((l: any) => l.id) || [user.locationId];
        where.locationId = { in: authorizedLocations };
    }

    const records = await prisma.loaderPayroll.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
          location: {
              select: {
                  name: true
              }
          }
      }
    });

    const m = month ? parseInt(month.toString()) : new Date().getMonth() + 1;
    const y = year ? parseInt(year.toString()) : new Date().getFullYear();
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59, 999);

    const supervisorAdvances = await prisma.advance.aggregate({
        where: {
            employee: {
                department: { equals: "LOADERS", mode: "insensitive" },
                position: { equals: "LOADER SUPERVISER", mode: "insensitive" },
                ...(locationId && locationId !== "all" ? { locationId } : {})
            },
            issuedAt: {
                gte: startDate,
                lte: endDate
            }
        },
        _sum: {
            principalAmount: true
        }
    });

    const totalAdvance = supervisorAdvances._sum.principalAmount || 0;

    return NextResponse.json({ records, supervisorAdvance: totalAdvance });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch loader payroll" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { month, year, records } = await request.json();

    if (!month || !year || !Array.isArray(records)) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Allow the immediate previous month through the 10th of the current month.
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const requestedMonthDate = new Date(year, month - 1, 1);
    const currentMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const previousMonthDate = new Date(currentYear, currentMonth - 2, 1);
    const isPastMonth = requestedMonthDate < currentMonthDate;
    const isImmediatePreviousMonth =
      year === previousMonthDate.getFullYear() &&
      month === previousMonthDate.getMonth() + 1;
    const isWithinPreviousMonthUploadWindow = currentDate.getDate() <= 10;

    if (isPastMonth && !(isImmediatePreviousMonth && isWithinPreviousMonthUploadWindow)) {
        return NextResponse.json({ error: "Cannot upload records for previous months" }, { status: 400 });
    }

    // Process records in a transaction
    const results = await prisma.$transaction(async (tx) => {
        const processed = [];
        for (const record of records) {
            const { 
              locationId,
              setup, 
              empId, 
              name, 
              designation, 
              department,
              basicSalary,
              workingDays,
              basicPayable,
              netSalary
            } = record;
            
            if (!name || !locationId) continue;

            const payrollData = {
                setup: setup?.toString() || "",
                empId: empId?.toString() || "LOADERS",
                designation: designation?.toString() || "LOADER",
                department: department?.toString() || "LOGISTIC",
                basicSalary: parseFloat(basicSalary) || 0,
                workingDays: parseFloat(workingDays) || 0,
                basicPayable: parseFloat(basicPayable) || 0,
                netSalary: parseFloat(netSalary) || 0,
            };

            const payrollRecord = await tx.loaderPayroll.upsert({
                where: {
                    name_month_year_locationId: {
                        name: name.toString(),
                        month,
                        year,
                        locationId: locationId.toString()
                    }
                },
                update: payrollData,
                create: {
                    name: name.toString(),
                    month,
                    year,
                    locationId: locationId.toString(),
                    ...payrollData
                }
            });
            processed.push(payrollRecord);
        }
        return processed;
    }, {
        timeout: 60000 
    });

    return NextResponse.json({ success: true, count: results.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save loader payroll" }, { status: 500 });
  }
}
