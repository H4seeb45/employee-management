"use client";

import React, { forwardRef } from "react";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface EmployeePrintDetailsProps {
  employee: any;
}

export const EmployeePrintDetails = forwardRef<HTMLDivElement, EmployeePrintDetailsProps>(
  ({ employee }, ref) => {
    if (!employee) return null;

    const LabelValue = ({ label, value }: { label: string; value: any }) => (
      <div className="flex flex-col mb-4">
        <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider mb-1">{label}</span>
        <span className="text-sm font-semibold border-b border-gray-100 pb-1">{value || "---"}</span>
      </div>
    );

    const SectionTitle = ({ title }: { title: string }) => (
      <div className="bg-gray-50 p-2 my-4 border-l-4 border-gray-800">
        <h3 className="text-sm font-bold uppercase tracking-widest">{title}</h3>
      </div>
    );

    return (
      <div ref={ref} className="p-10 text-slate-900 bg-white print:p-8" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
        {/* Header */}
        <div className="flex justify-between items-start mb-8 border-b-2 border-slate-900 pb-6">
          <div className="flex-shrink-0">
          <Avatar className="h-24 w-24 border-2 border-slate-100 dark:border-slate-800 shadow-sm">
            <AvatarImage
              src={employee.avatar || "/placeholder.svg"}
              alt={employee.employeeName}
            />
            {/* <AvatarFallback className="text-2xl font-bold bg-sky-100 text-sky-700">
              {employee.employeeName?.charAt(0)}
            </AvatarFallback> */}
          </Avatar>
        </div>
          <h1 className="text-3xl font-black uppercase mb-1">Sadiq Traders</h1>
          <div>
            <h1 className="text-3xl font-black uppercase mb-1">{employee.location.name} - Employee Profile</h1>
            <p className="text-slate-500 font-medium">Generated on {new Date().toLocaleDateString()}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold">{employee.employeeName}</h2>
            <p className="text-slate-600 font-semibold">{employee.position} ({employee.employeeId})</p>
            <p className="text-slate-500">{employee.department} Office</p>
          </div>
        </div>

        {/* Personal Details Section */}
        <SectionTitle title="Personal Information" />
        <div className="grid grid-cols-3 gap-x-8 gap-y-2">
          <LabelValue label="Full Name" value={employee.employeeName} />
          <LabelValue label="Father's Name" value={employee.fatherName} />
          <LabelValue label="CNIC Number" value={employee.cnicNumber} />
          <LabelValue label="Date of Birth" value={employee.birthDate ? new Date(employee.birthDate).toLocaleDateString() : null} />
          <LabelValue label="Gender" value={employee.gender} />
          <LabelValue label="Marital Status" value={employee.maritalStatus} />
          <LabelValue label="Phone Number" value={employee.phone} />
          <LabelValue label="Email Address" value={employee.email} />
          <LabelValue label="Blood Group" value={employee.bloodGroup} />
          <div className="col-span-3">
            <LabelValue label="Home Address" value={employee.address} />
          </div>
        </div>

        {/* Employment Info Section */}
        <SectionTitle title="Employment Details" />
        <div className="grid grid-cols-3 gap-x-8 gap-y-2">
          <LabelValue label="Setup/Location" value={employee.location?.name} />
          <LabelValue label="Designation" value={employee.position} />
          <LabelValue label="Department" value={employee.department} />
          <LabelValue label="Joining Date" value={employee.joinDate ? new Date(employee.joinDate).toLocaleDateString() : null} />
          <LabelValue label="Status" value={employee.status} />
          <LabelValue label="Probation Confirmation" value={employee.probationConfirmationDate ? new Date(employee.probationConfirmationDate).toLocaleDateString() : null} />
          <LabelValue label="Reference Name" value={employee.referenceName} />
          <LabelValue label="Emergency Contact" value={employee.emergencyContactName} />
          <LabelValue label="Emergency Number" value={employee.emergencyContactNumber} />
        </div>

        {/* Financial Section */}
        <SectionTitle title="Salary & Compensation" />
        <div className="grid grid-cols-3 gap-x-8 gap-y-2">
          <LabelValue label="Basic Salary" value={employee.basicSalary ? `Rs. ${Number(employee.basicSalary).toLocaleString()}` : null} />
          <LabelValue label="Attendance Allowance" value={employee.attendanceAllowance ? `Rs. ${Number(employee.attendanceAllowance).toLocaleString()}` : null} />
          <LabelValue label="Daily Allowance" value={employee.dailyAllowance ? `Rs. ${Number(employee.dailyAllowance).toLocaleString()}` : null} />
          <LabelValue label="Fuel Allowance" value={employee.fuelAllowance ? `Rs. ${Number(employee.fuelAllowance).toLocaleString()}` : null} />
          <LabelValue label="Conveyance Allowance" value={employee.conveyanceAllowance ? `Rs. ${Number(employee.conveyanceAllowance).toLocaleString()}` : null} />
          <LabelValue label="Maintainence" value={employee.maintainence ? `Rs. ${Number(employee.maintainence).toLocaleString()}` : null} />
          <LabelValue label="Commission" value={employee.comission ? `Rs. ${Number(employee.comission).toLocaleString()}` : null} />
          <LabelValue label="KPI Incentives" value={employee.eachKpiIncentives ? `Rs. ${Number(employee.eachKpiIncentives).toLocaleString()}` : null} />
          <LabelValue label="Incentives" value={employee.incentives ? `Rs. ${Number(employee.incentives).toLocaleString()}` : null} />
          <LabelValue label="Category Incentive" value={employee.categoryIncentive ? `Rs. ${Number(employee.categoryIncentive).toLocaleString()}` : null} />
          <LabelValue label="Tax Deduction" value={employee.taxDeduction} />
          <LabelValue label="EOBI Deduction" value={employee.eobiDeduction} />
          <LabelValue label="Social Security" value={employee.socialSecurityDeduction} />
        </div>

        {/* Documents Checklist Section */}
        <SectionTitle title="Documents Information" />
        <div className="grid grid-cols-4 gap-4 text-[10px]">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 border ${employee.cnicCopyUrl ? 'bg-slate-900' : ''}`} />
            <span>CNIC Copy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 border ${employee.eduDocsUrl ? 'bg-slate-900' : ''}`} />
            <span>Edu. Docs</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 border ${employee.cvUrl ? 'bg-slate-900' : ''}`} />
            <span>CV / Resume</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 border ${employee.guaranteeChequeUrl ? 'bg-slate-900' : ''}`} />
            <span>Guarantee Cheque</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 border ${employee.guarantorChequeUrl ? 'bg-slate-900' : ''}`} />
            <span>Guarantor Cheque</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 border ${employee.guarantorCnicUrl ? 'bg-slate-900' : ''}`} />
            <span>Guarantor CNIC</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 border ${employee.stampPaperUrl ? 'bg-slate-900' : ''}`} />
            <span>Stamp Paper</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 border ${employee.utilityBillUrl ? 'bg-slate-900' : ''}`} />
            <span>Utility Bill</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 border ${employee.drivingLicenseUrl ? 'bg-slate-900' : ''}`} />
            <span>Driving License</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 border ${employee.policeCertUrl ? 'bg-slate-900' : ''}`} />
            <span>Police Cert.</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 border ${employee.clearanceLetterUrl ? 'bg-slate-900' : ''}`} />
            <span>Clearance Letter</span>
          </div>
        </div>

        {/* Signatures Section */}
        <div className="mt-20 flex justify-between px-10">
          <div className="text-center">
            <div className="w-64 border-t-2 border-slate-900 pt-3">
              <p className="font-bold uppercase tracking-widest text-xs">Employee Signature</p>
              <p className="text-[10px] text-gray-500 mt-1 italic">Date: ____/____/________</p>
            </div>
          </div>
          <div className="text-center">
            <div className="w-64 border-t-2 border-slate-900 pt-3">
              <p className="font-bold uppercase tracking-widest text-xs">HR Signature</p>
              <p className="text-[10px] text-gray-500 mt-1 italic">Date: ____/____/________</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-4 border-t border-gray-200 text-center text-[10px] text-gray-400">
          <p>This is a system-generated official document. Confidentiality should be maintained at all times.</p>
        </div>
      </div>
    );
  }
);

EmployeePrintDetails.displayName = "EmployeePrintDetails";
