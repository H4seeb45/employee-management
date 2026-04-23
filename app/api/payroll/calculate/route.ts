import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const monthStr = searchParams.get("month");
    const yearStr = searchParams.get("year");
    const locationParam = searchParams.get("locationId");
    const locationId = locationParam === "all" ? null : (locationParam || user.locationId);
    const employeeIds = searchParams.get("employeeIds");

    if (!monthStr || !yearStr) {
      return NextResponse.json({ error: "Month and Year are required" }, { status: 400 });
    }

    const month = parseInt(monthStr);
    const year = parseInt(yearStr);

    const where: any = {};
    if (locationId) where.locationId = locationId;
    if (employeeIds) where.id = { in: employeeIds.split(",") };

    // Calculate Working Days (without Sundays)
    const getWorkingDaysCount = (y: number, m: number) => {
      const lastDay = new Date(y, m, 0).getDate();
      let count = 0;
      for (let day = 1; day <= lastDay; day++) {
        const d = new Date(y, m - 1, day);
        if (d.getDay() !== 0) count++;
      }
      return count;
    };

    const totalMonthDays = new Date(year, month, 0).getDate();
    const workingDaysCount = getWorkingDaysCount(year, month);
    const daysWorkedConst = 26; // "26 for now"

    // Fetch employees
    const employees = await prisma.employee.findMany({
      where,
      include: {
        location: true,
        payrolls: {
          where: {
            month: month,
            year: year
          }
        },
        adjustments: {
          where: {
            month: month,
            year: year
          }
        },
        loans: {
          where: { 
            status: "Disbursed", 
            balance: { gt: 0.01 } // Use threshold to avoid precision issues
          },
        },
        advances: {
          where: { 
            status: "Disbursed", 
            balance: { gt: 0.01 } 
          },
        },
        attendances: {
          where: {
            date: {
              gte: new Date(Date.UTC(year, month - 1, 1)),
              lte: new Date(Date.UTC(year, month - 1, totalMonthDays, 23, 59, 59))
            }
          }
        },
      },
    });

    const calculations = employees.map((emp) => {
      // Calculate actual days worked from attendance
      const actualDaysWorked = emp.attendances.reduce((total, att) => {
        if (att.status === "Present" || att.status === "Late") return total + 1;
        if (att.status === "Half Day") return total + 0.5;
        return total;
      }, 0);

      const basicSalary = emp.basicSalary || 0;
      const basicPayable = (basicSalary / workingDaysCount) * actualDaysWorked;

      // Allowances
      // Allowances & Adjustments
      const adj = emp.adjustments[0];
      const attAllowance = (adj?.attendanceAllowance ?? emp.attendanceAllowance ?? 0);
      const dailyAllowance = (adj?.dailyAllowance ?? emp.dailyAllowance ?? 0);
      const fuelAllowance = (adj?.fuelAllowance ?? emp.fuelAllowance ?? 0);
      const conveyanceAllowance = (adj?.conveyanceAllowance ?? emp.conveyanceAllowance ?? 0);
      const maintenance = (adj?.maintainence ?? emp.maintainence ?? 0);
      
      const commission = (adj?.comission ?? emp.comission ?? 0);
      const kpiIncentive = (adj?.eachKpiIncentives ?? emp.eachKpiIncentives ?? 0);
      const incentives = (adj?.incentives ?? emp.incentives ?? 0);
      const categoryIncentive = (adj?.categoryIncentive ?? emp.categoryIncentive ?? 0);
      
      const olpersMilk = (adj?.olpersMilk ?? emp.olpersMilk ?? 0);
      const olpersCareem = (adj?.olpersCareem ?? emp.olpersCareem ?? 0);
      const eidIncentive = (adj?.eidIncentive ?? emp.eidIncentive ?? 0);
      const olpers500ml = (adj?.olpers500ml ?? emp.olpers500ml ?? 0);

      const loaderAllowance = emp.department === "LOADERS" ? (emp.loaderAllowance || 0) : 0;

      const totalIncentives = attAllowance + dailyAllowance + fuelAllowance + conveyanceAllowance + 
                             maintenance + commission + kpiIncentive + incentives + categoryIncentive +
                             olpersMilk + olpersCareem + eidIncentive + olpers500ml + loaderAllowance;
      const grossSalary = basicPayable + totalIncentives;

      // Deductions
      const eobi = emp.eobiDeduction === "Yes" ? 400 : 0;
      const socialSecurity = emp.socialSecurityDeduction === "Yes" ? 520 : 0;
      
      const shortages = adj?.shortages || 0;
      const marketCredit = adj?.marketCredit || 0;

      // Income Tax calculation
      const annualGross = grossSalary * 12;
      let annualTax = 0;
      if (annualGross <= 600000) {
        annualTax = 0;
      } else if (annualGross <= 1200000) {
        annualTax = (annualGross - 600000) * 0.01;
      } else if (annualGross <= 2200000) {
        annualTax = 6000 + (annualGross - 1200000) * 0.11;
      } else if (annualGross <= 3200000) {
        annualTax = 116000 + (annualGross - 2200000) * 0.23;
      } else if (annualGross <= 4100000) {
        annualTax = 346000 + (annualGross - 3200000) * 0.3;
      } else {
        annualTax = 616000 + (annualGross - 4100000) * 0.35;
      }
      const incomeTax = annualTax / 12;

      // Advance & Loan - Checking current month against issuedAt
      const calcYear = parseInt(yearStr);
      const calcMonth = parseInt(monthStr) - 1; // 0-indexed for comparison
      
      // Check if this month's payroll is already processed
      const existingProcessed = emp.payrolls.find(p => p.status === "Processed" || p.status === "Paid");

      const loanDeduction = existingProcessed 
        ? (existingProcessed.loan || 0)
        : emp.loans.reduce((sum, l) => {
            // Take the installment but cap it at the remaining balance
            let installment = l.monthlyInstallment || l.balance || 0;
            if (l.balance !== null && installment > l.balance) {
              installment = l.balance;
            }
            
            if (installment <= 0) return sum;
            
            if (l.issuedAt) {
              const startDate = new Date(l.issuedAt);
              const startYear = startDate.getFullYear();
              const startMonth = startDate.getMonth();
              
              if (calcYear < startYear || (calcYear === startYear && calcMonth < startMonth)) {
                return sum;
              }
            }
            return sum + installment;
          }, 0);

      const advanceDeduction = existingProcessed
        ? (existingProcessed.advance || 0)
        : emp.advances.reduce((sum, a) => {
            let installment = a.monthlyInstallment || a.balance || 0;
            if (a.balance !== null && installment > a.balance) {
              installment = a.balance;
            }

            if (installment <= 0) return sum;
            
            if (a.issuedAt) {
              const startDate = new Date(a.issuedAt);
              const startYear = startDate.getFullYear();
              const startMonth = startDate.getMonth();
              
              if (calcYear < startYear || (calcYear === startYear && calcMonth < startMonth)) {
                return sum;
              }
            }
            return sum + installment;
          }, 0);

      const totalDeduction = eobi + socialSecurity + incomeTax + loanDeduction + advanceDeduction + shortages + marketCredit;
      const netSalary = grossSalary - totalDeduction;

      // if (emp.employeeName === "Ronan Lindsey"){
      //   console.log("emp advances",emp.advances);
      //   console.log("emp loans",emp.loans);
      //   console.log("loanDeduction",loanDeduction);
      //   console.log("advanceDeduction",advanceDeduction);
      // }
      return {
        employeeId: emp.id,
        employeeName: emp.employeeName,
        empId: emp.employeeId,
        designation: emp.position,
        department: emp.department,
        locationName: emp.location?.name || "-",
        basicSalary,
        totalDays: totalMonthDays,
        workingDays: workingDaysCount,
        daysWorked: actualDaysWorked,
        basicPayable,
        attendanceAllowance: attAllowance,
        dailyAllowance,
        fuelAllowance,
        conveyanceAllowance,
        maintainence: maintenance,
        comission: commission,
        eachKpiIncentives: kpiIncentive,
        incentives,
        categoryIncentive,
        olpersMilk,
        olpersCareem,
        eidIncentive,
        olpers500ml,
        loadersAllowance: loaderAllowance,
        totalIncentives,
        grossSalary,
        eobi,
        socialSecurity,
        incomeTax,
        advance: advanceDeduction,
        loan: loanDeduction,
        shortages,
        marketCredit,
        totalDeduction,
        netSalary,
      };
    });

    return NextResponse.json({
      month,
      year,
      workingDays: workingDaysCount,
      calculations,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to calculate payroll" }, { status: 500 });
  }
}
