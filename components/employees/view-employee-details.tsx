"use client";

import { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { EmployeePrintDetails } from "./employee-print-details";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Award,
  FileText,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Building,
  User,
  ExternalLink,
  DollarSign,
  Download,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";


interface ViewEmployeeDetailsProps {
  employee: any;
}


export function ViewEmployeeDetails({ employee }: ViewEmployeeDetailsProps) {
  const [isClient, setIsClient] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Employee-Profile-${employee?.employeeName}`,
  });

  useEffect(() => {
    setIsClient(true);
  }, []);
  const getDepartmentColor = (department: string) => {
    const dept = department?.toUpperCase();
    switch (dept) {
      case "FINANCE": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "HR": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "SALES": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getStatusColor = (status: string) => {
    if (status?.startsWith("Active")) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    if (status?.startsWith("Inactive")) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  };

  const InfoRow = ({ label, value }: { label: string; value: any }) => (
    <div className="flex flex-col space-y-1">
      <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</span>
      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{value || "---"}</span>
    </div>
  );

  const DocRow = ({ label, url }: { label: string; url: string }) => (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-blue-600" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-700 font-medium text-sm flex items-center gap-1">
          View <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="text-xs text-slate-400 italic">Not available</span>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-shrink-0">
          <Avatar className="h-24 w-24 border-2 border-slate-100 dark:border-slate-800 shadow-sm">
            <AvatarImage
              src={employee.avatar || "/placeholder.svg"}
              alt={employee.employeeName}
            />
            <AvatarFallback className="text-2xl font-bold bg-sky-100 text-sky-700">
              {employee.employeeName?.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex-grow">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{employee.employeeName}</h2>
              <p className="text-slate-500 font-medium">{employee.position} • {employee.employeeId}</p>
            </div>
            {isClient && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handlePrint()}
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print Details
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline" className={cn("px-3 py-1", getDepartmentColor(employee.department))}>
              {employee.department}
            </Badge>
            <Badge variant="outline" className={cn("px-3 py-1", getStatusColor(employee.status))}>
              {employee.status}
            </Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid grid-cols-5 w-full h-12">
          <TabsTrigger value="personal" className="font-semibold">Personal Info</TabsTrigger>
          <TabsTrigger value="employment" className="font-semibold">Employment Info</TabsTrigger>
          <TabsTrigger value="salary" className="font-semibold">Salary Info</TabsTrigger>
          <TabsTrigger value="documents" className="font-semibold">Documents Info</TabsTrigger>
          <TabsTrigger value="security" className="font-semibold">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4 mt-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <InfoRow label="CNIC Number" value={employee.cnicNumber} />
              <InfoRow label="CNIC Issue Date" value={employee.cnicIssueDate ? new Date(employee.cnicIssueDate).toLocaleDateString() : null} />
              <InfoRow label="CNIC Expiry Date" value={employee.cnicExpiryDate ? new Date(employee.cnicExpiryDate).toLocaleDateString() : null} />
              <InfoRow label="Mobile Number" value={employee.phone} />
              <InfoRow label="Father's Name" value={employee.fatherName} />
              <InfoRow label="Emergency Contact" value={employee.emergencyContactName} />
              <InfoRow label="Emergency Number" value={employee.emergencyContactNumber} />
              <InfoRow label="Date of Birth" value={employee.birthDate ? new Date(employee.birthDate).toLocaleDateString() : null} />
              <InfoRow label="Blood Group" value={employee.bloodGroup} />
              <InfoRow label="Marital Status" value={employee.maritalStatus} />
              <InfoRow label="Gender" value={employee.gender} />
              <InfoRow label="Email Address" value={employee.email} />
              <InfoRow label="Reference Name" value={employee.referenceName} />
              <InfoRow label="Reference Contact" value={employee.referenceNumber} />
              <InfoRow label="Reference Email" value={employee.referenceEmail} />
              <InfoRow label="License Expiry Date" value={employee.licenseExpiryDate ? new Date(employee.licenseExpiryDate).toLocaleDateString() : null} />
              <div className="md:col-span-2 lg:col-span-3">
                <InfoRow label="Home Address" value={employee.address} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employment" className="space-y-4 mt-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <InfoRow label="Setup Name" value={employee.location.name} />
              <InfoRow label="Employee ID" value={employee.employeeId} />
              <InfoRow label="Department" value={employee.department} />
              <InfoRow label="Designation" value={employee.position} />
              <InfoRow label="Status" value={employee.status} />
              <InfoRow label="Joining Date" value={employee.joinDate ? new Date(employee.joinDate).toLocaleDateString() : null} />
              <InfoRow label="Leaving Date" value={employee.leaveDate ? new Date(employee.leaveDate).toLocaleDateString() : null} />
              {/* <InfoRow label="Location" value={employee.location?.name} /> */}
              <InfoRow label="Probation Confirmation" value={employee.probationConfirmationDate ? new Date(employee.probationConfirmationDate).toLocaleDateString() : null} />
              <InfoRow label="Annual Leaves" value={employee.annualLeaves != null ? `${employee.annualLeaves} Days` : "0 Days"} />
              <InfoRow label="Notice Period" value={employee.noticePeriod != null ? `${employee.noticePeriod} Days` : "0 Days"} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary" className="space-y-4 mt-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { id: "basicSalary", label: "Basic Salary" },
                { id: "attendanceAllowance", label: "Attendance Allowance" },
                { id: "dailyAllowance", label: "Daily Allowance" },
                { id: "fuelAllowance", label: "Fuel Allowance" },
                { id: "conveyanceAllowance", label: "Conveyance Allowance" },
                { id: "maintainence", label: "Maintainence" },
                { id: "comission", label: "Comission" },
                { id: "eachKpiIncentives", label: "Each KPI Incentives" },
                { id: "incentives", label: "Incentives" },
                { id: "categoryIncentive", label: "Category Incentive" },
                { id: "loaderAllowance", label: "Loader Allowance" },
              ].map(field => (
                <div key={field.id} className="space-y-2 p-3 rounded-lg border border-slate-100 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/20">
                  <InfoRow label={field.label} value={employee[field.id] != null ? `Rs. ${Number(employee[field.id]).toLocaleString()}` : "---"} />
                  {employee.salaryAllowanceDetails?.[field.id] && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Additional Details</span>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 italic leading-relaxed">{employee.salaryAllowanceDetails[field.id]}</p>
                    </div>
                  )}
                </div>
              ))}
              
              <div className="col-span-full pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Deductions & Eligibility</h3>
              </div>
              
              <InfoRow label="Tax Deduction" value={employee.taxDeduction} />
              <InfoRow label="EOBI Deduction" value={employee.eobiDeduction} />
              <InfoRow label="Social Security Deduction" value={employee.socialSecurityDeduction} />
              
              <InfoRow label="Advance Amount Eligibility" value={employee.advanceEligibilityAmount != null ? `Rs. ${Number(employee.advanceEligibilityAmount).toLocaleString()}` : "Rs. 0"} />
              <InfoRow label="Loan Amount Eligibility" value={employee.loanEligibilityAmount != null ? `Rs. ${Number(employee.loanEligibilityAmount).toLocaleString()}` : "Rs. 0"} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4 mt-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <DocRow label="CNIC Copy Front" url={employee.cnicCopyUrl} />
              <DocRow label="CNIC Copy Back" url={employee.cnicCopyBackUrl} />
              <DocRow label="Educational Documents" url={employee.eduDocsUrl} />
              <DocRow label="CV / Resume" url={employee.cvUrl} />
              <DocRow label="Guarantee Cheque" url={employee.guaranteeChequeUrl} />
              <DocRow label="Guarantor Cheque" url={employee.guarantorChequeUrl} />
              <DocRow label="Guarantor CNIC Front" url={employee.guarantorCnicUrl} />
              <DocRow label="Guarantor CNIC Back" url={employee.guarantorCnicBackUrl} />
              <DocRow label="Stamp Paper" url={employee.stampPaperUrl} />
              <DocRow label="Utility Bill" url={employee.utilityBillUrl} />
              <DocRow label="Driving License Front" url={employee.drivingLicenseUrl} />
              <DocRow label="Driving License Back" url={employee.drivingLicenseBackUrl} />
              <DocRow label="Police Certificate" url={employee.policeCertUrl} />
              <DocRow label="Clearance Letter" url={employee.clearanceLetterUrl} />
              {employee.otherDocuments?.map((doc: any, index: number) => (
                <DocRow key={`custom-${index}`} label={doc.name} url={doc.url} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4 mt-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-6">
              {employee.user ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InfoRow label="Login Email" value={employee.user.email} />
                  <InfoRow label="Account Status" value="Active" />
                  <div className="text-sm text-slate-500 mt-2 font-medium">
                    Initial password was set to: {employee.employeeId}123!
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 text-slate-500">
                  <p>No login credentials have been generated for this employee yet.</p>
                  <p className="text-sm mt-1">Use the "Key" icon on the employee table to generate them.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Hidden printable component */}
      <div className="hidden">
        <EmployeePrintDetails ref={printRef} employee={employee} />
      </div>
    </div>
  );
}
