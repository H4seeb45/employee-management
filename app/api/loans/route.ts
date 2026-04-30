import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser, isSuperAdminUser } from "@/lib/auth";
import { differenceInYears } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = isAdminUser(user);
    const isSuperAdmin = isSuperAdminUser(user);
    const { searchParams } = new URL(request.url);
    const locationParam = searchParams.get("locationId");
    const locationId = locationParam === "all" ? null : locationParam;
    let whereClause: any = {};
    const employeeRecord = await prisma.employee.findUnique({ where: { userId: user.id } });
    const isBM = user.roles?.some((ur: any) => ur.role.name === "Business Manager");
    const authorizedIds = [
      user.locationId,
      ...(user.authorizedLocations?.map((l: any) => l.id) || []),
    ].filter(Boolean);

    if (isSuperAdmin) {
      if (locationId) {
        whereClause = { employee: { locationId } };
      }
    } else if (isAdmin) {
      if (locationId) {
        if (authorizedIds.includes(locationId)) {
          whereClause = { employee: { locationId } };
        } else {
          whereClause = { employee: { id: "none" } }; // Force empty
        }
      } else {
        whereClause = { employee: { locationId: { in: authorizedIds } } };
      }
    } else if (employeeRecord) {
      whereClause = { employeeId: employeeRecord.id };
    } else {
      whereClause = { employee: { locationId: user.locationId } };
    }

    const list = await prisma.loan.findMany({
      include: { 
        employee: {
          include: {
            loans: { where: { status: { not: "Rejected" } }, select: { balance: true } },
            advances: { where: { status: { not: "Rejected" } }, select: { balance: true } },
            location: true
          }
        } 
      },
      where: whereClause,
      orderBy: { issuedAt: "desc" }
    });

    const enrichedList = list.map(loan => {
      const totalLoanBalance = loan.employee?.loans.reduce((sum, l) => sum + (l.balance || 0), 0) || 0;
      const totalAdvanceBalance = loan.employee?.advances.reduce((sum, a) => sum + (a.balance || 0), 0) || 0;
      
      return {
        ...loan,
        totalLoanBalance,
        totalAdvanceBalance
      };
    });

    return NextResponse.json(enrichedList);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch loans" },
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
    const body = await req.json();

    const parseDate = (v: any) => {
      if (!v && v !== 0) return null;
      const d = v instanceof Date ? v : new Date(v);
      return isNaN(d.getTime()) ? null : d;
    };

    const employeeId = body.employeeId ?? body.employee_id ?? undefined;
    if (!employeeId)
      return NextResponse.json(
        { error: "Missing employeeId" },
        { status: 400 }
      );
      
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { locationId: true, joinDate: true, basicSalary: true, loanEligibilityAmount: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const employeeRecord = await prisma.employee.findUnique({ where: { userId: user.id } });
    const isBusinessManager = user?.roles?.some((role: any) => ["Business Manager"].includes(role));
    // Allow employees to create for themselves, otherwise must have right location access
    if (!isAdmin && !isBusinessManager) {
      if (employeeRecord && employeeId !== employeeRecord.id) {
         return NextResponse.json({ error: "You can only request loans for yourself." }, { status: 403 });
      } else if (!employeeRecord && employee.locationId !== user.locationId) {
         return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const principalAmount = typeof body.principalAmount === "number"
      ? body.principalAmount
      : parseFloat(body.principalAmount) || 0;

    const eligibilityLimit = employee.loanEligibilityAmount;

    if (eligibilityLimit && eligibilityLimit > 0) {
      const currentYear = new Date().getFullYear();
      const existingLoansSum = await prisma.loan.aggregate({
        _sum: { principalAmount: true },
        where: {
          employeeId,
          status: { not: "Rejected" },
          issuedAt: {
            gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
            lte: new Date(`${currentYear}-12-31T23:59:59.999Z`)
          }
        }
      });

      const totalLentThisYear = existingLoansSum._sum.principalAmount || 0;
      const proposedTotal = totalLentThisYear + principalAmount;

      if (proposedTotal > eligibilityLimit) {
        return NextResponse.json({ 
          error: `Requested loan of ${principalAmount} would exceed the remaining eligibility limit. (Already lent this year: ${totalLentThisYear}, Max limit: ${eligibilityLimit})` 
        }, { status: 400 });
      }
    } else {
      // Rule 1: Loan for an employee can only be applied after one year of joining date.
      if (!employee.joinDate) {
        return NextResponse.json({ error: "Employee join date is not set" }, { status: 400 });
      }
      const yearsSinceJoin = differenceInYears(new Date(), new Date(employee.joinDate));
      if (yearsSinceJoin < 1) {
        return NextResponse.json({ error: "Loan can only be applied after one year of joining date." }, { status: 400 });
      }

      // Rule 2: Max two base salaries can be given when applying for Loan
      if (!employee.basicSalary || employee.basicSalary <= 0) {
        return NextResponse.json({ error: "Employee basic salary data is not available." }, { status: 400 });
      }
      const maxLoan = employee.basicSalary * 2;
      if (principalAmount > maxLoan) {
        return NextResponse.json({ error: `Requested loan exceeds maximum limit of two base salaries (${maxLoan}).` }, { status: 400 });
      }

      // Rule 3: Only one loan per year
      const currentYear = new Date().getFullYear();
      const existingLoanThisYear = await prisma.loan.findFirst({
        where: {
          employeeId,
          status: { not: "Rejected" },
          issuedAt: {
            gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
            lte: new Date(`${currentYear}-12-31T23:59:59.999Z`)
          }
        }
      });

      if (existingLoanThisYear) {
        return NextResponse.json({ error: `An employee can only apply for one loan per year.` }, { status: 400 });
      }
    }

    const data: any = {
      employeeId,
      principalAmount,
      issuedAt: parseDate(body.issuedAt),
      dueAt: parseDate(body.dueAt),
      balance:
        typeof body.balance === "number"
          ? body.balance
          : parseFloat(body.balance) || principalAmount,
      installments: body.installments ?? null,
      monthlyInstallment:
        typeof body.monthlyInstallment === "number"
          ? body.monthlyInstallment
          : parseFloat(body.monthlyInstallment) || null,
      status: "Submitted", // Default status for new requests
      notes: body.notes ?? null,
    };

    const created = await prisma.loan.create({ data });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create loan" },
      { status: 500 }
    );
  }
}
