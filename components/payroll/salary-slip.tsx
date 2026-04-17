import React from 'react';
import { Card } from "@/components/ui/card";
import { Shield } from "lucide-react";

interface SalarySlipProps {
  payroll: any;
  month: string;
  year: string;
}

export function SalarySlip({ payroll, month, year }: SalarySlipProps) {
  const monthName = new Date(0, parseInt(month) - 1).toLocaleString('default', { month: 'long' });

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "-";
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto border shadow-sm print:shadow-none print:border-none print:p-0" id="salary-slip">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#0A192F] uppercase tracking-tighter">Sadiq Traders</h1>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-slate-900 uppercase">Pay Slip</h2>
          <p className="text-slate-500">For the month of {monthName} {year}</p>
        </div>
      </div>

      {/* Employee Info Grid */}
      <div className="grid grid-cols-2 gap-8 mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100">
        <div className="space-y-2">
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span className="text-slate-500 text-sm">Employee Name:</span>
            <span className="font-bold text-slate-800">{payroll.employeeName || payroll.employee?.employeeName}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span className="text-slate-500 text-sm">Employee ID:</span>
            <span className="font-bold text-slate-800">{payroll.empId || payroll.employee?.employeeId}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span className="text-slate-500 text-sm">Designation:</span>
            <span className="font-bold text-slate-800">{payroll.designation || payroll.employee?.position}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span className="text-slate-500 text-sm">Department:</span>
            <span className="font-bold text-slate-800">{payroll.department || payroll.employee?.department}</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span className="text-slate-500 text-sm">Days Worked:</span>
            <span className="font-bold text-slate-800">{payroll.daysWorked} / {payroll.workingDays}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span className="text-slate-500 text-sm">Location:</span>
            <span className="font-bold text-slate-800">{payroll.locationName || payroll.employee?.location?.name || "-"}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span className="text-slate-500 text-sm">Slip Date:</span>
            <span className="font-bold text-slate-800">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Financial Details Table */}
      <div className="grid grid-cols-2 gap-x-12">
        {/* Earnings */}
        <div>
          <h3 className="text-lg font-bold border-b-2 border-[#0A192F] mb-4 text-[#0A192F]">Earnings</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Basic Payable</span>
              <span className="font-medium">{formatCurrency(payroll.basicPayable)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Attendance Allowance</span>
              <span className="font-medium">{formatCurrency(payroll.attendanceAllowance)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Daily Allowance</span>
              <span className="font-medium">{formatCurrency(payroll.dailyAllowance)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Fuel Allowance</span>
              <span className="font-medium">{formatCurrency(payroll.fuelAllowance)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Conveyance Allowance</span>
              <span className="font-medium">{formatCurrency(payroll.conveyanceAllowance)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Maintenance</span>
              <span className="font-medium">{formatCurrency(payroll.maintainence)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Commission</span>
              <span className="font-medium">{formatCurrency(payroll.comission)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Incentives</span>
              <span className="font-medium">{formatCurrency(payroll.incentives)}</span>
            </div>
            {payroll.loadersAllowance > 0 && (
              <div className="flex justify-between text-sm">
                <span>Loaders Allowance</span>
                <span className="font-medium">{formatCurrency(payroll.loadersAllowance)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t border-slate-200 pt-2 mt-4 text-slate-900">
              <span>Gross Salary</span>
              <span>{formatCurrency(payroll.grossSalary)}</span>
            </div>
          </div>
        </div>

        {/* Deductions */}
        <div>
          <h3 className="text-lg font-bold border-b-2 border-red-800 mb-4 text-red-800">Deductions</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>EOBI</span>
              <span className="font-medium">{formatCurrency(payroll.eobi)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Social Security</span>
              <span className="font-medium">{formatCurrency(payroll.socialSecurity)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Income Tax</span>
              <span className="font-medium">{formatCurrency(payroll.incomeTax)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Advance Deduction</span>
              <span className="font-medium">{formatCurrency(payroll.advance)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Loan Installment</span>
              <span className="font-medium">{formatCurrency(payroll.loan)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-slate-200 pt-2 mt-4 text-red-800">
              <span>Total Deductions</span>
              <span>{formatCurrency(payroll.totalDeduction)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Net Salary Highlight */}
      <div className="mt-12 border-2 border-slate-900 p-6 rounded-xl flex justify-between items-center bg-slate-50">
        <div>
          <h4 className="text-sm uppercase tracking-widest text-slate-500 font-bold">Net Payable Amount</h4>
          <p className="text-3xl font-black text-[#0A192F]">{formatCurrency(payroll.netSalary)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-tighter opacity-70 mb-1">In Words</p>
          <p className="text-sm italic">Excluding taxes and deductions as calculated above.</p>
        </div>
      </div>

      {/* Signature Section */}
      <div className="mt-16 grid grid-cols-2 gap-24">
        <div className="text-center pt-8 border-t border-slate-300">
          <p className="text-sm font-bold text-slate-800">Employee Signature</p>
        </div>
        <div className="text-center pt-8 border-t border-slate-300">
          <p className="text-sm font-bold text-slate-800">Authorized Signature</p>
          <p className="text-[10px] text-slate-500 uppercase mt-1">For Sadiq Traders</p>
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-12 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-4">
        <p>This is a computer generated document and does not require a physical stamp unless specified.</p>
        <p>© 2026 Sadiq Traders HRMS. All Rights Reserved.</p>
      </div>
    </div>
  );
}
