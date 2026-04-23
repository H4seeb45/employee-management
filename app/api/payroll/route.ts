import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser, isSuperAdminUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = isAdminUser(user);
    const isSuperAdmin = isSuperAdminUser(user);
    const { searchParams } = new URL(request.url);
    const locationId = isSuperAdmin ? searchParams.get("locationId") : null;
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;

    const list = await prisma.payroll.findMany({
      include: { 
        employee: {
          include: {
            location: true
          }
        } 
      },
      where: {
        AND: [
          isAdmin
            ? locationId
              ? { employee: { locationId } }
              : {}
            : { employee: { locationId: user.locationId } },
          month ? { month } : {},
          year ? { year } : {},
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(list);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch payrolls" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = isAdminUser(user);
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();

    const sanitizePayroll = (data: any) => {
      const {
        employeeName,
        empId,
        designation,
        department,
        locationName,
        bankName,
        accountNumber,
        routeName,
        joinDate,
        cnicNumber,
        id,
        employee,
        ...rest
      } = data;
      return rest;
    };

    // Helper to update loan/advance balances
    const updateBalances = async (employeeId: string, month: number, year: number, loanDed: number, advDed: number) => {
      if (loanDed <= 0 && advDed <= 0) return;

      // Ensure we don't deduct multiple times for the same month
      const existing = await prisma.payroll.findUnique({
        where: { employeeId_month_year: { employeeId, month, year } }
      });

      if (existing && existing.status === "Processed") {
        // Already processed, don't update balances again unless we want to handle diffs
        return;
      }

      if (loanDed > 0) {
        const activeLoans = await prisma.loan.findMany({
          where: { employeeId, balance: { gt: 0 }, status: { in: ["Approved", "APPROVED", "Disbursed"] } },
          orderBy: { issuedAt: 'asc' }
        });

        let remaining = loanDed;
        for (const loan of activeLoans) {
          if (remaining <= 0) break;
          const toDeduct = Math.min(loan.balance || 0, remaining);
          await prisma.loan.update({
            where: { id: loan.id },
            data: { balance: { decrement: toDeduct } }
          });
          remaining -= toDeduct;
        }
      }

      if (advDed > 0) {
        const activeAdvances = await prisma.advance.findMany({
          where: { employeeId, balance: { gt: 0 }, status: { in: ["Approved", "APPROVED", "Disbursed"] } },
          orderBy: { issuedAt: 'asc' }
        });

        let remaining = advDed;
        for (const adv of activeAdvances) {
          if (remaining <= 0) break;
          const toDeduct = Math.min(adv.balance || 0, remaining);
          await prisma.advance.update({
            where: { id: adv.id },
            data: { balance: { decrement: toDeduct } }
          });
          remaining -= toDeduct;
        }
      }
    };

    // Support bulk save
    if (Array.isArray(body)) {
      const results = await Promise.all(
        body.map(async (item) => {
          const sanitized = sanitizePayroll(item);
          
          // Update balances before upserting (only if new or moving to Processed)
          if (item.status === "Processed") {
            await updateBalances(item.employeeId, item.month, item.year, item.loan || 0, item.advance || 0);
          }

          return prisma.payroll.upsert({
            where: {
              employeeId_month_year: {
                employeeId: item.employeeId,
                month: item.month,
                year: item.year,
              }
            },
            update: { ...sanitized, updatedAt: new Date() },
            create: sanitized,
          });
        })
      );
      return NextResponse.json(results, { status: 201 });
    }

    // Single save
    const employeeId = body.employeeId;
    if (!employeeId) return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });

    if (body.status === "Processed") {
        await updateBalances(employeeId, body.month, body.year, body.loan || 0, body.advance || 0);
    }

    const sanitizedBody = sanitizePayroll(body);
    const created = await prisma.payroll.upsert({
      where: {
        employeeId_month_year: {
          employeeId: employeeId,
          month: body.month,
          year: body.year,
        }
      },
      update: { ...sanitizedBody, updatedAt: new Date() },
      create: sanitizedBody,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create payroll" },
      { status: 500 }
    );
  }
}
